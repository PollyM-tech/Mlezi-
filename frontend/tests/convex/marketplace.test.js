import sharp from 'sharp'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
import { DAY } from '../../convex/lib/marketplace.js'
const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
async function person(t, role, suffix = role) {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: `${suffix}@example.test`, emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + DAY })
    const accountId = await ctx.db.insert('accounts', { authSubject: userId, role, email: `${suffix}@example.test`, phone: '0712345678', createdAt: Date.now() })
    if (role === 'admin') await ctx.db.insert('adminSessions', { accountId, sessionId, expiresAt: Date.now() + 3600000 })
    if (role === 'employer') await ctx.db.insert('employers', { accountId, name: 'Parent' })
    return { accountId, sessionId }
  })
  const userId = await t.run(async ctx => (await ctx.db.get(ids.sessionId)).userId)
  const client = t.withIdentity({ subject: `${userId}|${ids.sessionId}` })
  return { ...ids, client, read: (path, params) => client.query(api.marketplace.read, { path, ...(params ? { params } : {}) }), write: (path, body = {}, method = 'PUT') => client.mutation(api.marketplace.write, { path, method, body }) }
}
async function uploaded(t, owner, purpose) {
  const storageId = await t.run(ctx => ctx.storage.store(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' })))
  await t.run(ctx => ctx.db.insert('uploadedAssets', { accountId: owner.accountId, storageId, purpose, claimed: false, createdAt: Date.now() }))
  return storageId
}
async function caregiver(t, suffix = 'caregiver', extras = {}) {
  const who = await person(t, 'caregiver', suffix)
  const photo = await uploaded(t, who, 'photo'), national_id = await uploaded(t, who, 'national_id'), selfie = await uploaded(t, who, 'selfie')
  const result = await who.write('/caregivers/profile', { name: 'Nanny', service_category: 'travel_nanny', service_types: ['travel', 'live_out'], location: 'Nairobi', years_experience: '3', phone: '0798765432', photo, national_id, selfie, consent: 'true', ...extras }, 'POST')
  // Marketplace scenarios use an approved adult fixture; identity tests reset its status.
  await t.run(async ctx => { await ctx.db.patch(result.profile.id, { identityStatus: 'verified', adultConfirmedAt: Date.now() }); for (const row of await ctx.db.query('verificationSubmissions').collect()) if (row.caregiverId === result.profile.id) await ctx.db.delete(row._id) })
  return { ...who, id: result.profile.id }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })
describe('Convex marketplace migration', () => {
  it('matches local household terms and regional languages while retaining filters and adult visibility', async () => {
    const t = make()
    const relevant = await caregiver(t, 'relevant', { bio: 'Childcare and house help by agreement.', languages: ['Kirundi', 'Kiswahili'] })
    const unrelated = await caregiver(t, 'unrelated', { bio: 'Infant childcare only.', languages: ['English'] })
    const hidden = await caregiver(t, 'hidden', { bio: 'Househelp.', languages: ['Kirundi'] })
    await t.run(async ctx => {
      await ctx.db.patch(unrelated.id, { premiumExpiresAt: Date.now() + DAY })
      await ctx.db.patch(hidden.id, { identityStatus: 'pending', adultConfirmedAt: undefined, premiumExpiresAt: Date.now() + DAY })
    })
    const query = params => t.query(api.marketplace.read, { path: '/caregivers', params })
    for (const q of ['maid', 'house help', 'domestic worker']) expect((await query({ q })).profiles.map(p => p.id)).toEqual([relevant.id])
    expect((await query({ q: 'nannies Nairobi', language: 'Kirundi' })).profiles.map(p => p.id)).toEqual([relevant.id])
    expect((await query({ language: 'Swahili' })).profiles.map(p => p.id)).toEqual([relevant.id])
    expect((await query({ q: 'maid', category: 'babysitter' })).total).toBe(0)
    expect((await query({ q: 'maid', language: 'Kinyarwanda' })).total).toBe(0)
  })
  it('allows public discovery without leaking contact details, IDs or evidence', async () => {
    const t = make(), c = await caregiver(t)
    const result = await t.query(api.marketplace.read, { path: `/caregivers/${c.id}` })
    expect(result.profile.name).toBe('Nanny'); expect(result.profile.photo_url).toBeTruthy()
    for (const field of ['phone', 'email', 'national_id', 'national_id_uploaded', 'accountId', 'photo', 'authSubject']) expect(result.profile).not.toHaveProperty(field)
    expect((await c.read('/caregivers/profile')).profile.national_id_uploaded).toBe(true)
    await expect(t.query(api.marketplace.read, { path: '/auth/me' })).rejects.toThrow('sign in')
  })
  it('enforces ownership and refuses injected verification or Premium status', async () => {
    const t = make(), c = await caregiver(t), other = await caregiver(t, 'other'), e = await person(t, 'employer')
    await expect(other.write(`/caregivers/${c.id}`, { name: 'Hijack' })).rejects.toThrow('own profile')
    await expect(e.write('/caregivers/profile', {}, 'POST')).rejects.toThrow('permission')
    await t.run(ctx => ctx.db.patch(c.id, { identityStatus: 'unverified', adultConfirmedAt: undefined }))
    await c.write('/caregivers/profile', { identityStatus: 'verified', premiumExpiresAt: Date.now() + DAY, ratingAverage: 5 })
    const p = (await c.read('/caregivers/profile')).profile
    expect(p.verification_status).toBe('unverified'); expect(p.premium_active).toBe(false); expect(p.rating_avg).toBe(0)
  })
  it('validates Other descriptions, travel services and pay ranges before claiming uploads', async () => {
    const t = make(), c = await caregiver(t)
    await expect(c.write('/caregivers/profile', { service_category: 'other' })).rejects.toThrow('describe')
    await expect(c.write('/caregivers/profile', { expected_pay_min: '500', expected_pay_max: '100' })).rejects.toThrow('Minimum')
    await expect(c.write('/caregivers/profile', { service_types: ['part_time'] })).rejects.toThrow('services')
    expect((await c.read('/caregivers/profile')).profile.service_types).toContain('travel')
  })
  it('does not let another caregiver publish a stolen private upload', async () => {
    const t = make(), c = await caregiver(t), other = await caregiver(t, 'other'), privateId = await uploaded(t, c, 'national_id')
    await expect(other.write('/caregivers/profile', { photo: privateId })).rejects.toThrow('belonging')
    await expect(c.write('/caregivers/profile', { photo: privateId })).rejects.toThrow('belonging')
  })
  it('preserves old contacts after expiry and pausing while blocking new unlocks', async () => {
    const t = make(), c = await caregiver(t), second = await caregiver(t, 'second'), e = await person(t, 'employer')
    await expect(e.write(`/contact/unlock/${c.id}`, {}, 'POST')).rejects.toThrow('Renew')
    const employerId = await t.run(async ctx => (await ctx.db.query('employers').first())._id)
    await t.run(ctx => ctx.db.patch(employerId, { accessExpiresAt: Date.now() + DAY }))
    await e.write(`/contact/unlock/${c.id}`, {}, 'POST')
    await e.write(`/contact/unlock/${c.id}`, {}, 'POST')
    expect(await t.run(ctx => ctx.db.query('contactUnlocks').collect())).toHaveLength(1)
    await t.run(ctx => ctx.db.patch(employerId, { accessExpiresAt: Date.now() - 1 }))
    await c.write('/caregivers/profile', { is_available: 'false' })
    expect((await e.read(`/contact/unlock/${c.id}`)).contact.email).toBe('caregiver@example.test')
    expect((await e.read('/employers/contacts')).total).toBe(1)
    await expect(e.write(`/contact/unlock/${second.id}`, {}, 'POST')).rejects.toThrow('Renew')
    expect((await t.query(api.marketplace.read, { path: '/caregivers' })).profiles.map(p => p.id)).not.toContain(c.id)
  })
  it('isolates employer shortlists and account edits', async () => {
    const t = make(), c = await caregiver(t), e = await person(t, 'employer'), other = await person(t, 'employer', 'otherparent')
    await e.write(`/shortlist/${c.id}`, {}, 'POST'); await e.write(`/shortlist/${c.id}`, {}, 'POST')
    expect((await e.read('/shortlist')).profiles).toHaveLength(1); expect((await other.read('/shortlist')).profiles).toHaveLength(0)
    await e.write('/employers/profile', { name: 'New Parent', phone: '0722222222' })
    expect((await e.read('/employers/dashboard')).profile.name).toBe('New Parent')
    await expect(e.write('/employers/profile', { role: 'admin' })).rejects.toThrow('Only your name')
    await e.write(`/shortlist/${c.id}`, {}, 'DELETE'); expect((await e.read('/shortlist')).profiles).toHaveLength(0)
  })
  it('requires a contact unlock for reviews and recalculates ratings on moderation', async () => {
    const t = make(), c = await caregiver(t), e = await person(t, 'employer'), admin = await person(t, 'admin')
    const path = `/caregivers/${c.id}/review`, data = { rating: 4, comment: 'Reliable care.', author_name: 'Parent Name' }
    await expect(e.write(path, data)).rejects.toThrow('Unlock')
    await t.run(async ctx => { const employer = await ctx.db.query('employers').first(); await ctx.db.insert('contactUnlocks', { employerId: employer._id, caregiverId: c.id, unlockedAt: Date.now() }) })
    const { review } = await e.write(path, data)
    await e.write(path, { ...data, rating: 5 })
    expect((await c.read(`/caregivers/${c.id}/reviews`)).rating_avg).toBe(5)
    await c.write(`/reviews/${review.id}/reply`, { reply: 'Thank you.' })
    await expect(e.write(`/reviews/${review.id}/reply`, { reply: 'Impersonation' })).rejects.toThrow('permission')
    await e.write(`/reviews/${review.id}/report`, { reason: 'Review issue' }, 'POST')
    await expect(e.read('/admin/reports')).rejects.toThrow('permission')
    await admin.write(`/admin/reviews/${review.id}/visibility`, { is_public: false })
    expect((await c.read(`/caregivers/${c.id}/reviews`)).review_count).toBe(0)
    await expect(e.write(path, data)).rejects.toThrow('moderation')
    await admin.write(`/admin/reviews/${review.id}/visibility`, { is_public: true })
    expect((await c.read(`/caregivers/${c.id}/reviews`)).rating_avg).toBe(5)
  })
  it('requires fresh matching identity evidence and revokes approval after identity edits', async () => {
    const t = make(), c = await caregiver(t), admin = await person(t, 'admin')
    await t.run(ctx => ctx.db.patch(c.id, { identityStatus: 'unverified', adultConfirmedAt: undefined }))
    await t.run(ctx => ctx.db.patch(c.id, { identityStatus: 'unverified', adultConfirmedAt: undefined }))
  const selfie = await uploaded(t, c, 'selfie')
    await expect(c.write('/verification/submit', { selfie }, 'POST')).rejects.toThrow('permission to compare')
    const { submission } = await c.write('/verification/submit', { selfie, consent: 'true' }, 'POST')
    await expect(admin.write(`/admin/verification/${submission.id}/approve`, {}, 'POST')).rejects.toThrow('Confirm')
    await admin.write(`/admin/verification/${submission.id}/approve`, { identity_compared: true, id_legible: true, adult_confirmed: true, birth_date: '1990-01-01' }, 'POST')
    expect((await c.read('/verification/status')).verification_status).toBe('verified')
    await c.write('/caregivers/profile', { name: 'Changed Name' })
    expect((await c.read('/verification/status')).verification_status).toBe('verified')
    const approved = await t.run(ctx => ctx.db.get(c.id))
    await c.write('/caregivers/profile', { photo: await uploaded(t, c, 'photo') })
    expect((await c.read('/verification/status')).verification_status).toBe('verified')
    expect((await t.run(ctx => ctx.db.get(c.id))).adultConfirmedAt).toBe(approved.adultConfirmedAt)
    await expect(c.write('/verification/submit', {}, 'POST')).rejects.toThrow('already approved')
    await expect(c.client.query(internal.files.evidence, { submissionId: submission.id, kind: 'national_id' })).rejects.toThrow('permission')
    const storageId = await admin.client.query(internal.files.evidence, { submissionId: submission.id, kind: 'national_id' })
    expect(storageId).toBeTruthy()
  })
  it('exposes server-owned prices and keeps live M-Pesa disabled', async () => {
    const t = make(), c = await caregiver(t), e = await person(t, 'employer')
    expect((await c.read('/memberships')).plans.map(p => [p.amount, p.days])).toEqual([[500, 365]])
    expect((await e.read('/memberships')).plans.map(p => [p.amount, p.days])).toEqual([[300, 30], [500, 90]])
    expect((await e.read('/memberships')).payments_enabled).toBe(false)
    await expect(e.write('/payments/unlock-pass', { amount: 1, status: 'completed' }, 'POST')).rejects.toThrow('M-Pesa')
  })
  it('applies filters before Premium priority and keeps page order stable', async () => {
    const t = make(), c = await caregiver(t), other = await caregiver(t, 'other', { service_category: 'nanny', service_types: ['live_in'] })
    await t.run(ctx => ctx.db.patch(other.id, { premiumExpiresAt: Date.now() + DAY }))
    const all = await t.query(api.marketplace.read, { path: '/caregivers' })
    expect(all.profiles[0].id).toBe(other.id)
    const matching = await t.query(api.marketplace.read, { path: '/caregivers', params: { category: 'travel_nanny' } })
    expect(matching.profiles.map(p => p.id)).toEqual([c.id])
    const first = await t.query(api.marketplace.read, { path: '/caregivers', params: { per_page: '1' } })
    const second = await t.query(api.marketplace.read, { path: '/caregivers', params: { per_page: '1', page: '2', rotation: first.rotation } })
    expect(first.profiles[0].id).not.toBe(second.profiles[0].id)
    await expect(t.query(api.marketplace.read, { path: '/caregivers', params: { pay_max: '500' } })).rejects.toThrow('pay period')
  })
  it('revoked native sessions cannot read or modify private application data', async () => {
    const t = make(), c = await caregiver(t)
    await t.run(ctx => ctx.db.delete(c.sessionId))
    await expect(c.read('/caregivers/profile')).rejects.toThrow('session has expired')
    await expect(c.write('/caregivers/profile', { name: 'Invalid' })).rejects.toThrow('session has expired')
  })
})

it('extends early renewals atomically and settles each payment only once', async () => {
  const t = make(), e = await person(t, 'employer')
  const expiry = Date.now() + 10 * DAY
  const { paymentId, employerId } = await t.run(async ctx => {
    const p = await ctx.db.query('employers').first()
    await ctx.db.patch(p._id, { accessExpiresAt: expiry })
    const paymentId = await ctx.db.insert('payments', { accountId: e.accountId, type: 'unlock_pass', planCode: 'employer_30_days', durationDays: 30, amount: 300, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() })
    return { paymentId, employerId: p._id }
  })
  await t.mutation(internal.memberships.settle, { paymentId, resultCode: 0 })
  await t.mutation(internal.memberships.settle, { paymentId, resultCode: 0 })
  expect(await t.run(async ctx => (await ctx.db.get(employerId)).accessExpiresAt)).toBe(expiry + 30 * DAY)
})

it('imports a complete snapshot once, preserving auth bindings and legacy links', async () => {
  const t = make(), admin = await person(t, 'admin')
  await t.run(ctx => ctx.db.patch(admin.accountId, { legacyId: 1 }))
  const storageId = await t.run(ctx => ctx.storage.store(new Blob(['image'], { type: 'image/png' })))
  const tables = {
    user: [{ id: 1, email: 'admin@example.test', role: 'admin', created_at: 1 }, { id: 2, email: 'nanny@example.test', role: 'caregiver', phone: '0711111111', created_at: 1 }, { id: 3, email: 'parent@example.test', role: 'employer', created_at: 1 }],
    caregiver_profile: [{ id: 12, user_id: 2, name: 'Legacy nanny', service_category: 'travel_nanny', service_types: ['travel'], years_experience: 2, pay_period: 'daily', is_available: true, verification_status: 'unverified', created_at: 1, updated_at: 2 }],
    employer_profile: [{ id: 8, user_id: 3, name: 'Legacy parent', unlock_pass_expires_at: Date.now() + DAY }],
    contact_unlock: [{ id: 20, employer_id: 8, caregiver_id: 12, unlocked_at: 1 }], shortlist: [{ id: 4, employer_id: 8, caregiver_id: 12, created_at: 1 }],
    review: [{ id: 7, from_user_id: 3, to_user_id: 2, rating: 4, comment: 'Legacy review', is_public: true, created_at: 1 }], verification_submission: [], report: [], payment: [],
  }
  const assets = ['photo', 'national_id'].map(field => ({ table: 'caregiver_profile', id: 12, field, storageId }))
  await expect(t.mutation(internal.migration.importSnapshot, { tables, assets: [] })).rejects.toThrow('Missing migrated')
  expect(await t.run(ctx => ctx.db.query('caregivers').collect())).toHaveLength(0)
  expect(await t.run(ctx => ctx.db.query('accounts').collect())).toHaveLength(1)
  await t.mutation(internal.migration.importSnapshot, { tables, assets })
  expect((await t.mutation(internal.migration.importSnapshot, { tables, assets })).alreadyImported).toBe(true)
  expect((await admin.read('/auth/me')).user.role).toBe('admin')
  await t.run(async ctx => { const row = await ctx.db.query('caregivers').first(); await ctx.db.patch(row._id, { identityStatus: 'verified', adultConfirmedAt: Date.now() }) })
  const p = await t.query(api.marketplace.read, { path: '/caregivers/12' })
  expect(p.profile.id).toBe(12); expect(p.profile.rating_avg).toBe(4)
  expect((await t.query(internal.migration.status)).counts.shortlists).toBe(1)
  const unlock = await t.run(ctx => ctx.db.query('contactUnlocks').first())
  const caregiverId = await t.run(async ctx => (await ctx.db.query('caregivers').first())._id)
  expect(unlock.caregiverId).toBe(caregiverId)
})

it('authenticates every private document request and validates upload bytes', async () => {
  vi.stubEnv('SITE_URL', 'http://localhost:5173')
  const t = make(), c = await caregiver(t), admin = await person(t, 'admin')
  await t.run(ctx => ctx.db.patch(c.id, { identityStatus: 'unverified', adultConfirmedAt: undefined }))
  const selfie = await uploaded(t, c, 'selfie')
  const { submission } = await c.write('/verification/submit', { selfie, consent: 'true' }, 'POST')
  const path = `/files/document?submissionId=${submission.id}&kind=national_id`
  expect((await t.fetch(path)).status).toBe(403)
  expect((await c.client.fetch(path)).status).toBe(403)
  const allowed = await admin.client.fetch(path)
  expect(allowed.status).toBe(200); expect(allowed.headers.get('Cache-Control')).toBe('no-store')
  const invalid = await c.client.fetch('/files/upload', { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Upload-Purpose': 'photo' }, body: 'not an image' })
  expect(invalid.status).toBe(400)
  const valid = await c.client.fetch('/files/upload', { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Upload-Purpose': 'selfie' }, body: new Uint8Array(await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()) })
  expect(valid.status).toBe(200)
})

it('allows a missing ID to be uploaded with a selfie, without permitting replacement of an existing ID', async () => {
  const t = make(), c = await caregiver(t)
  await t.run(async ctx => { await ctx.db.patch(c.id, {identityStatus:'unverified',adultConfirmedAt:undefined}); const row=await ctx.db.query('caregiverDocuments').withIndex('by_caregiver',q=>q.eq('caregiverId',c.id)).unique(); await ctx.storage.delete(row.nationalId.storageId) })
  expect((await c.read('/caregivers/profile')).profile.national_id_uploaded).toBe(false)
  const national_id = await uploaded(t,c,'national_id'), selfie = await uploaded(t,c,'selfie')
  await c.write('/verification/submit',{national_id,selfie,consent:'true'},'POST')
  expect((await c.read('/caregivers/profile')).profile.national_id_uploaded).toBe(true)
  // A display-name edit does not invalidate a pending comparison.
  await c.write('/caregivers/profile',{name:'New display name'})
  expect((await c.read('/verification/status')).verification_status).toBe('pending')
  const admin=await person(t,'admin'), submission=(await c.read('/verification/status')).submission
  await admin.write(`/admin/verification/${submission.id}/approve`,{identity_compared:true,id_legible:true,adult_confirmed:true,birth_date:'1990-01-01'},'POST')
  expect((await c.read('/verification/status')).verification_status).toBe('verified')
  await t.run(ctx=>ctx.db.patch(c.id,{identityStatus:'rejected',adultConfirmedAt:undefined}))
  await expect(c.write('/verification/submit',{national_id:await uploaded(t,c,'national_id'),selfie:await uploaded(t,c,'selfie'),consent:'true'},'POST')).rejects.toThrow('administrator assistance')
})
it('permits exact configured upload origins and loopback aliases, but not unrelated browser origins', async () => {
  vi.stubEnv('SITE_URL','http://localhost:5173')
  const t=make()
  const options=origin=>t.fetch('/files/upload',{method:'OPTIONS',headers:{Origin:origin}})
  expect((await options('http://127.0.0.1:5173')).headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:5173')
  expect((await options('https://evil.test')).headers.has('Access-Control-Allow-Origin')).toBe(false)
  vi.stubEnv('SITE_URL','https://mlezicare.com')
  expect((await options('http://localhost:5173')).headers.has('Access-Control-Allow-Origin')).toBe(false)
  vi.stubEnv('APP_ALLOWED_ORIGINS','http://localhost:5173,https://www.mlezicare.com')
  expect((await options('http://localhost:5173')).headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
})

it('invalidates a pending photo snapshot while preserving pending display-name changes', async () => {
  const t=make(), c=await caregiver(t), admin=await person(t,'admin')
  await t.run(ctx=>ctx.db.patch(c.id,{identityStatus:'unverified',adultConfirmedAt:undefined}))
  const {submission}=await c.write('/verification/submit',{selfie:await uploaded(t,c,'selfie'),consent:'true'},'POST')
  await c.write('/caregivers/profile',{photo:await uploaded(t,c,'photo')})
  expect((await c.read('/verification/status')).verification_status).toBe('unverified')
  await expect(admin.write(`/admin/verification/${submission.id}/approve`,{identity_compared:true,id_legible:true,adult_confirmed:true,birth_date:'1990-01-01'},'POST')).rejects.toThrow('no longer pending')
})
