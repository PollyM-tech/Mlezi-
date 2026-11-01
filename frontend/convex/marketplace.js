import { MANUAL_MPESA } from './lib/manualPaymentPolicy.js'
import { query, mutation } from './_generated/server.js'
import { consume, audit } from './lib/security.js'
import { v } from 'convex/values'
import { matchesKeywords, normalizeSearch } from './lib/discoverySearch.js'
import { requireAccount, accountIdentity, hasProfilePhoto } from './lib/permissions.js'
import { active, iso, fail, text, CATEGORIES, SERVICES, DAYS, AGES, SCOPES, PLANS, externalId, find, owned, publicProfile, employerProfile, reviewData, verificationData, paymentData, aggregate, profileFields, phone, confirmAdult, approvedAdult } from './lib/marketplace.js'

const args = { path: v.string(), params: v.optional(v.any()) }
const byEmployer = (ctx, table, id) => ctx.db.query(table).withIndex('by_pair', q => q.eq('employerId', id))
const pair = (ctx, table, employerId, caregiverId) => byEmployer(ctx, table, employerId).filter(q => q.eq(q.field('caregiverId'), caregiverId)).unique()
async function contact(ctx, caregiver) { const account = await ctx.db.get(caregiver.accountId); return { phone: account.phone || null, email: account.email } }
async function latestSubmission(ctx, caregiverId) { return (await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', caregiverId)).collect()).sort((a, b) => b.submittedAt - a.submittedAt)[0] }
function number(value, fallback, min, max, integer = true) {
  const n = value === undefined || value === '' ? fallback : Number(value)
  if (!Number.isFinite(n) || integer && !Number.isInteger(n) || n < min || n > max) fail('Select valid numeric filters and pagination')
  return n
}
async function search(ctx, params) {
  const p = params || {}
  const q = text(p.q || '', 'a search', 120).toLowerCase(), location = text(p.location || '', 'a location', 120).toLowerCase()
  const skill = text(p.skill || '', 'a skill', 80), language = text(p.language || '', 'a language', 80).toLowerCase()
  for (const [field, options] of [['category', CATEGORIES], ['service_type', SERVICES], ['available_day', DAYS], ['pay_period', ['monthly', 'daily', 'hourly']], ['age_group', AGES], ['travel_scope', SCOPES], ['identity_checked', ['true', 'false']]]) {
    if (p[field] && !options.includes(p[field])) fail('Select valid search filters')
  }
  const page = number(p.page, 1, 1, 1000000), perPage = number(p.per_page, 12, 1, 24)
  const experience = number(p.min_experience, 0, 0, 80), rating = number(p.min_rating, 0, 0, 5, false)
  const budget = p.pay_max ? number(p.pay_max, 0, 0, 2147483647) : null
  if (budget !== null && !p.pay_period) fail('Choose a pay period when setting a budget')
  // Rotation is chosen by the server, stable for pagination for up to one hour.
  const bucket = Math.floor(Date.now() / 3600000)
  const rotation = p.rotation ? number(p.rotation, bucket, bucket - 1, bucket) : bucket
  let profiles = await ctx.db.query('caregivers').withIndex('by_published_category', q => p.category && p.category !== 'travel_nanny' ? q.eq('identityStatus', 'verified').eq('isAvailable', true).eq('category', p.category) : q.eq('identityStatus', 'verified').eq('isAvailable', true)).filter(q => q.neq(q.field('adultConfirmedAt'), undefined)).take(501)
  if (profiles.length > 500) fail('Too many profiles for this search. Choose a care category to narrow the results.')
  const visible = await Promise.all(profiles.map(async c => { const account = await ctx.db.get(c.accountId); return approvedAdult(c) && !account.suspendedAt && !account.deletionRequestedAt && await hasProfilePhoto(ctx, account) }))
  profiles = profiles.filter((_, i) => visible[i])
  profiles = profiles.filter(c => {
    const travel = c.category === 'travel_nanny' || c.services.includes('travel')
    return matchesKeywords(c, q)
      && (!p.category || (p.category === 'travel_nanny' ? travel : c.category === p.category))
      && (!p.service_type || c.services.includes(p.service_type) || p.service_type === 'travel' && travel)
      && (!p.travel_scope || travel && (c.travelScope === p.travel_scope || p.travel_scope !== 'both' && c.travelScope === 'both'))
      && (!p.age_group || c.ageGroups.includes(p.age_group)) && (!language || c.languages.some(l => normalizeSearch(l) === normalizeSearch(language)))
      && (p.service_type !== 'live_out' || !location || (c.location || '').toLowerCase().includes(location))
      && (!p.available_day || c.availableDays.includes(p.available_day)) && (!skill || c.skills.includes(skill))
      && (!p.pay_period || c.payPeriod === p.pay_period) && (budget === null || c.payMin !== undefined && c.payMin <= budget)
      && c.yearsExperience >= experience && (!rating || c.reviewCount > 0 && c.ratingAverage >= rating)
      && (p.identity_checked !== 'true' || c.identityStatus === 'verified')
  })
  const premium = profiles.filter(c => active(c.premiumExpiresAt)).sort((a, b) => a._creationTime - b._creationTime || a._id.localeCompare(b._id))
  const free = profiles.filter(c => !active(c.premiumExpiresAt)).sort((a, b) => b.createdAt - a.createdAt || a._id.localeCompare(b._id))
  const offset = premium.length ? rotation % premium.length : 0
  const sorted = [...premium.slice(offset), ...premium.slice(0, offset), ...free]
  return { profiles: await Promise.all(sorted.slice((page - 1) * perPage, page * perPage).map(c => publicProfile(ctx, c))), total: sorted.length, page, per_page: perPage, rotation: String(rotation) }
}

export const read = query({ args, handler: async (ctx, { path, params = {} }) => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) fail('Provide valid query filters')
  let match
  if (path === '/caregivers') return search(ctx, params)
  if ((match = path.match(/^\/caregivers\/([^/]+)\/reviews$/))) {
    const p = await find(ctx, 'caregivers', match[1]), page = number(params.page, 1, 1, 1000000)
    const rows = await ctx.db.query('reviews').withIndex('by_caregiver_public', q => q.eq('caregiverId', p._id).eq('isPublic', true)).collect()
    rows.sort((a, b) => b.createdAt - a.createdAt)
    return { reviews: rows.slice((page - 1) * 20, page * 20).map(reviewData), total: rows.length, page, rating_avg: p.ratingAverage, review_count: p.reviewCount }
  }
  if (path === '/auth/me') {
    const a = await requireAccount(ctx)
    const p = a.role === 'admin' ? null : await ctx.db.query(a.role === 'caregiver' ? 'caregivers' : 'employers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
    return { user: { id: a._id, email: a.email, phone: a.phone || null, role: a.role, profile: p ? a.role === 'caregiver' ? await publicProfile(ctx, p, a) : employerProfile(p, a) : null } }
  }
  if (path === '/caregivers/profile') { const { account, profile } = await owned(ctx, 'caregivers', 'caregiver'); return { profile: await publicProfile(ctx, profile, account) } }
  if ((match = path.match(/^\/caregivers\/([^/]+)$/))) { const p = await find(ctx, 'caregivers', match[1]); const a = await ctx.db.get(p.accountId); if (a.suspendedAt || a.deletionRequestedAt || !await hasProfilePhoto(ctx,a)) fail('Caregiver not found',404); if (!approvedAdult(p)) { if (!await ctx.auth.getUserIdentity()) fail('Caregiver not found',404); const viewer = await requireAccount(ctx); if (viewer._id !== p.accountId && viewer.role !== 'admin') fail('Caregiver not found',404) }; return { profile: await publicProfile(ctx,p) } }
  if (['/employers/profile', '/employers/dashboard', '/employers/contacts', '/shortlist'].includes(path)) {
    const { account, profile: e } = await owned(ctx, 'employers', 'employer')
    if (path === '/employers/profile') return { profile: employerProfile(e, account) }
    if (path === '/employers/dashboard') return { profile: employerProfile(e, account), counts: { shortlist: (await byEmployer(ctx, 'shortlists', e._id).collect()).length, contacts: (await byEmployer(ctx, 'contactUnlocks', e._id).collect()).length, reviews: (await ctx.db.query('reviews').withIndex('by_pair', q => q.eq('employerAccountId', account._id)).collect()).length } }
    let rows = await byEmployer(ctx, path === '/shortlist' ? 'shortlists' : 'contactUnlocks', e._id).collect()
    const checked = await Promise.all(rows.map(async row => approvedAdult(await ctx.db.get(row.caregiverId))))
    rows = rows.filter((_, i) => checked[i])
    rows.sort((a, b) => (b.unlockedAt || b.createdAt) - (a.unlockedAt || a.createdAt))
    if (path === '/shortlist') return { profiles: await Promise.all(rows.map(async row => publicProfile(ctx, await ctx.db.get(row.caregiverId)))) }
    const page = number(params.page, 1, 1, 1000000)
    return { contacts: await Promise.all(rows.slice((page - 1) * 12, page * 12).map(async row => { const p = await ctx.db.get(row.caregiverId); return { profile: await publicProfile(ctx, p), contact: await contact(ctx, p), unlocked_at: iso(row.unlockedAt) } })), total: rows.length, page, per_page: 12 }
  }
  if ((match = path.match(/^\/contact\/unlock\/([^/]+)$/))) {
    const { profile: e } = await owned(ctx, 'employers', 'employer'), p = await find(ctx, 'caregivers', match[1])
    if (!approvedAdult(p)) return { unlocked: false, can_unlock: false, available: false }
    if (await pair(ctx, 'contactUnlocks', e._id, p._id)) return { unlocked: true, contact: await contact(ctx, p) }
    return { unlocked: false, can_unlock: p.isAvailable && active(e.accessExpiresAt), available: p.isAvailable }
  }
  if ((match = path.match(/^\/caregivers\/([^/]+)\/review\/mine$/))) {
    const a = await requireAccount(ctx, 'employer'), p = await find(ctx, 'caregivers', match[1])
    const r = await ctx.db.query('reviews').withIndex('by_pair', q => q.eq('employerAccountId', a._id).eq('caregiverId', p._id)).unique()
    return { review: r ? reviewData(r) : null }
  }
  if (path === '/verification/status') {
    const { profile } = await owned(ctx, 'caregivers', 'caregiver')
    return { verification_status: profile.identityStatus, submission: verificationData(await latestSubmission(ctx, profile._id)) }
  }
  if (path === '/memberships') {
    const a = await requireAccount(ctx, 'employer', 'caregiver'), table = a.role === 'employer' ? 'employers' : 'caregivers'
    const p = await ctx.db.query(table).withIndex('by_account', q => q.eq('accountId', a._id)).unique()
    const expiry = a.role === 'employer' ? p?.accessExpiresAt : p?.premiumExpiresAt
    return { active: active(expiry), expires_at: iso(expiry), payments_enabled: false, manual_payment: MANUAL_MPESA, plans: Object.entries(PLANS).filter(([, plan]) => plan.role === a.role).map(([code, plan]) => ({ code, ...plan })) }
  }
  if (path === '/payments' || path.startsWith('/payments/')) {
    const a = await requireAccount(ctx, 'employer', 'caregiver')
    if (path === '/payments') return { payments: (await ctx.db.query('payments').withIndex('by_account', q => q.eq('accountId', a._id)).order('desc').take(30)).map(paymentData) }
    const p = await find(ctx, 'payments', path.slice('/payments/'.length)); if (p.accountId !== a._id) fail('Payment not found', 404)
    return { payment: paymentData(p) }
  }
  if (path.startsWith('/admin/')) {
    await requireAccount(ctx, 'admin')
    if (path === '/admin/verification') {
      const rows = await ctx.db.query('verificationSubmissions').withIndex('by_status', q => q.eq('status', 'pending')).take(100)
      return { submissions: await Promise.all(rows.map(async s => { const p = await ctx.db.get(s.caregiverId); return { ...verificationData(s), caregiver_id: externalId(p), name: p.name, has_identity_selfie: !!s.selfie } })) }
    }
    if (path === '/admin/reports') return { reports: (await ctx.db.query('reports').order('desc').take(100)).map(r => ({ id: externalId(r), reason: r.reason, details: r.details || '', status: r.status, created_at: iso(r.createdAt) })) }
  }
  fail('This page is unavailable', 404)
} })

async function claimAsset(ctx, id, accountId, purpose) {
  const storageId = ctx.db.system.normalizeId('_storage', String(id))
  if (!storageId) fail('Upload a valid image')
  const asset = await ctx.db.query('uploadedAssets').withIndex('by_storage', q => q.eq('storageId', storageId)).unique()
  if (!asset || asset.accountId !== accountId || asset.purpose !== purpose || asset.claimed || asset.createdAt + 3600000 < Date.now()) fail('Upload a fresh image belonging to your account', 403)
  await ctx.db.patch(asset._id, { claimed: true })
  return { provider: 'convex', storageId }
}
async function saveProfile(ctx, data, creating, requestedId) {
  const a = await accountIdentity(ctx, 'caregiver')
  const old = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  if (creating && old) fail('Caregiver profile already exists', 409)
  if (!creating && !old) fail('Caregiver profile not found', 404)
  if (requestedId && (await find(ctx, 'caregivers', requestedId))._id !== old?._id) fail('You can only edit your own profile', 403)
  const fields = profileFields(data, old), contactPhone = data.phone === undefined ? a.phone : phone(data.phone)
  if (creating && (!data.photo || !data.national_id || !data.selfie)) fail('Profile photo, National ID and selfie are required')
  if (creating && data.consent !== 'true') fail('Confirm permission to compare your ID, selfie and profile photo')
  if (!creating && data.national_id) fail('National ID replacement requires administrator assistance')
  if (data.photo) fields.photo = await claimAsset(ctx, data.photo, a._id, 'photo')
  if (fields.photo) fields.photoUrl = '' // URLs are resolved in public projections.
  let nationalId
  if (data.national_id) nationalId = await claimAsset(ctx, data.national_id, a._id, 'national_id')
  if (old) {
    if (fields.photo && old.identityStatus === 'pending') {
      fields.identityStatus = 'unverified'
      fields.adultConfirmedAt = undefined
      const pending = await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', old._id)).filter(q => q.eq(q.field('status'), 'pending')).collect()
      for (const s of pending) await ctx.db.patch(s._id, { status: 'rejected', rejectionReason: 'Your profile photo changed while review was pending. Please submit a new identity check.', reviewedAt: Date.now() })
    }
    await ctx.db.patch(old._id, { ...fields, updatedAt: Date.now() })
  }
  const id = old?._id || await ctx.db.insert('caregivers', { ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), identityStatus: 'unverified', ratingAverage: 0, reviewCount: 0, createdAt: Date.now(), updatedAt: Date.now(), accountId: a._id })
  if (nationalId) await ctx.db.insert('caregiverDocuments', { caregiverId: id, nationalId })
  if (creating) {
    const selfie = await claimAsset(ctx, data.selfie, a._id, 'selfie')
    const profile = await ctx.db.get(id)
    await ctx.db.insert('verificationSubmissions', { caregiverId: id, selfie, profileName: profile.name, profilePhoto: profile.photo, status: 'pending', submittedAt: Date.now() })
    await ctx.db.patch(id, { identityStatus: 'pending' })
    await audit(ctx, a._id, 'identity_submitted', id)
  }
  if (!await hasProfilePhoto(ctx, a)) fail('A profile photo is required')
  await ctx.db.patch(a._id, { phone: contactPhone })
  return { profile: await publicProfile(ctx, await ctx.db.get(id), { ...a, phone: contactPhone }) }
}

export const write = mutation({ args: { ...args, method: v.string(), body: v.optional(v.any()) }, handler: async (ctx, { path, method, body: data = {} }) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Provide valid account details')
  const actor = await accountIdentity(ctx)
  await consume(ctx, `writes:${actor._id}`, 30, 60000)
  let match
  if (path === '/caregivers/profile' && ['POST', 'PUT'].includes(method)) return saveProfile(ctx, data, method === 'POST')
  if ((match = path.match(/^\/caregivers\/([^/]+)$/)) && method === 'PUT') return saveProfile(ctx, data, false, match[1])
  if (path === '/employers/profile' && method === 'PUT') {
    const { account, profile } = await owned(ctx, 'employers', 'employer')
    if (Object.keys(data).some(key => !['name', 'phone'].includes(key))) fail('Only your name and phone can be changed here')
    const name = text(data.name ?? profile.name ?? '', 'your name', 120, true), value = phone(data.phone ?? account.phone)
    await ctx.db.patch(account._id, { name, phone: value }); await ctx.db.patch(profile._id, { name })
    return { profile: employerProfile({ ...profile, name }, { ...account, phone: value }) }
  }
  if ((match = path.match(/^\/contact\/unlock\/([^/]+)$/)) && method === 'POST') {
    const { profile: e } = await owned(ctx, 'employers', 'employer'), p = await find(ctx, 'caregivers', match[1])
    if (!approvedAdult(p)) fail('This caregiver must complete the 18+ identity check before contact access is available', 403)
    if (!await pair(ctx, 'contactUnlocks', e._id, p._id)) {
      if (!p.isAvailable) fail('This caregiver is not accepting new requests right now', 409)
      if (!active(e.accessExpiresAt)) fail('Renew your contact-access pass to unlock new contacts', 402)
      await ctx.db.insert('contactUnlocks', { employerId: e._id, caregiverId: p._id, unlockedAt: Date.now() })
    }
    return { unlocked: true, contact: await contact(ctx, p) }
  }
  if ((match = path.match(/^\/shortlist\/([^/]+)$/)) && ['POST', 'DELETE'].includes(method)) {
    const { profile: e } = await owned(ctx, 'employers', 'employer'), p = await find(ctx, 'caregivers', match[1]), existing = await pair(ctx, 'shortlists', e._id, p._id)
    if (method === 'DELETE' && existing) await ctx.db.delete(existing._id)
    if (method === 'POST' && !existing) await ctx.db.insert('shortlists', { employerId: e._id, caregiverId: p._id, createdAt: Date.now() })
    return { saved: method === 'POST' }
  }
  if ((match = path.match(/^\/caregivers\/([^/]+)\/review$/)) && method === 'PUT') {
    const { account, profile: e } = await owned(ctx, 'employers', 'employer'), p = await find(ctx, 'caregivers', match[1])
    if (!await pair(ctx, 'contactUnlocks', e._id, p._id)) fail('Unlock this caregiver’s contact before reviewing', 403)
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) fail('Choose a rating from 1 to 5')
    const comment = text(data.comment, 'a review', 2000, true), authorName = text(data.author_name, 'your first name', 80, true).split(/\s+/)[0]
    const old = await ctx.db.query('reviews').withIndex('by_pair', q => q.eq('employerAccountId', account._id).eq('caregiverId', p._id)).unique()
    if (old && !old.isPublic) fail('This review is under moderation. Contact support.', 403)
    const fields = { rating: data.rating, comment, authorName, updatedAt: Date.now() }
    if (old) await ctx.db.patch(old._id, fields)
    const id = old?._id || await ctx.db.insert('reviews', { ...fields, employerAccountId: account._id, caregiverId: p._id, isPublic: true, createdAt: Date.now() })
    await aggregate(ctx, p._id)
    const updated = await ctx.db.get(p._id)
    return { review: reviewData(await ctx.db.get(id)), rating_avg: updated.ratingAverage, review_count: updated.reviewCount }
  }
  if ((match = path.match(/^\/reviews\/([^/]+)\/reply$/)) && method === 'PUT') {
    const a = await requireAccount(ctx, 'caregiver'), r = await find(ctx, 'reviews', match[1]), p = await ctx.db.get(r.caregiverId)
    if (!r.isPublic || p.accountId !== a._id) fail('Review not found', 404)
    await ctx.db.patch(r._id, { reply: text(data.reply, 'a reply', 2000, true), updatedAt: Date.now() })
    return { review: reviewData(await ctx.db.get(r._id)) }
  }
  if ((match = path.match(/^\/reviews\/([^/]+)\/report$/)) && method === 'POST') {
    const a = await requireAccount(ctx, 'employer', 'caregiver'), r = await find(ctx, 'reviews', match[1])
    if (!r.isPublic) fail('Review not found', 404)
    await ctx.db.insert('reports', { reporterId: a._id, reportedAccountId: r.employerAccountId, reason: 'review_abuse', details: `Review #${externalId(r)}: ${text(data.reason, 'a report reason', 1000, true)}`, status: 'open', createdAt: Date.now() })
    return { message: 'Report submitted for administrator review' }
  }
  if (path === '/verification/submit' && method === 'POST') {
    const { profile: p, account } = await owned(ctx, 'caregivers', 'caregiver')
    if (['verified', 'pending'].includes(p.identityStatus)) fail('An identity check is already approved or pending', 409)
    let documents = await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', p._id)).unique()
    const storedId = documents?.nationalId && (documents.nationalId.provider !== 'convex' || await ctx.db.system.get(documents.nationalId.storageId))
    if (data.national_id) {
      if (storedId) fail('National ID replacement requires administrator assistance')
      const nationalId = await claimAsset(ctx, data.national_id, account._id, 'national_id')
      if (documents) await ctx.db.patch(documents._id, { nationalId })
      else await ctx.db.insert('caregiverDocuments', { caregiverId: p._id, nationalId })
      documents = { nationalId }
    }
    if (!documents || !await hasProfilePhoto(ctx, account) || documents.nationalId.provider === 'convex' && !await ctx.db.system.get(documents.nationalId.storageId)) fail('Upload your national ID and profile photo before identity review')
    if (data.consent !== 'true') fail('Confirm permission to compare your selfie and ID')
    const selfie = await claimAsset(ctx, data.selfie, account._id, 'selfie')
    const id = await ctx.db.insert('verificationSubmissions', { caregiverId: p._id, selfie, profileName: p.name, profilePhoto: p.photo, status: 'pending', submittedAt: Date.now() })
    await ctx.db.patch(p._id, { identityStatus: 'pending' })
    return { verification_status: 'pending', submission: verificationData(await ctx.db.get(id)) }
  }
  if (path.startsWith('/payments/') && method === 'POST') {
    await requireAccount(ctx, 'employer', 'caregiver')
    fail('Automated M-Pesa payments remain disabled. Use the manual payment instructions in Membership.', 503)
  }
  if (path.startsWith('/admin/')) {
    const a = await requireAccount(ctx, 'admin')
    if ((match = path.match(/^\/admin\/verification\/([^/]+)\/(approve|reject)$/)) && method === 'POST') {
      const s = await find(ctx, 'verificationSubmissions', match[1]), p = await ctx.db.get(s.caregiverId), approve = match[2] === 'approve'
      const reason = text(data.reason || '', 'a review reason', 1000, !approve)
      if (s.status !== 'pending' || p.identityStatus !== 'pending') fail('This identity request is no longer pending', 409)
      if (approve && (data.identity_compared !== true || data.id_legible !== true)) fail('Confirm that the ID is legible and you compared the identity evidence')
      if (approve) { if (data.adult_confirmed !== true) fail('Confirm that you checked the ID date of birth and the applicant is at least 18'); confirmAdult(data.birth_date) }
      const documents = await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', p._id)).unique()
      if (approve && (!documents || !await hasProfilePhoto(ctx, await ctx.db.get(p.accountId)) || s.selfie?.provider === 'convex' && !await ctx.db.system.get(s.selfie.storageId) || documents.nationalId.provider === 'convex' && !await ctx.db.system.get(documents.nationalId.storageId))) fail('All three identity images must be present before approval')
      if (approve && (!s.selfie || JSON.stringify(s.profilePhoto) !== JSON.stringify(p.photo))) fail('Identity details changed or evidence is incomplete. Request a fresh submission.', 409)
      await audit(ctx, a._id, `identity_${approve ? 'approved' : 'rejected'}`, s._id)
      await ctx.db.patch(s._id, { status: approve ? 'approved' : 'rejected', reviewedBy: a._id, reviewedAt: Date.now(), adultConfirmedAt: approve ? Date.now() : undefined, rejectionReason: approve ? undefined : reason })
      await ctx.db.patch(p._id, { identityStatus: approve ? 'verified' : 'rejected', adultConfirmedAt: approve ? Date.now() : undefined })
      return { verification_status: approve ? 'verified' : 'rejected', submission: verificationData(await ctx.db.get(s._id)) }
    }
    if ((match = path.match(/^\/admin\/reviews\/([^/]+)\/visibility$/)) && method === 'PUT') {
      const r = await find(ctx, 'reviews', match[1]); if (typeof data.is_public !== 'boolean') fail('is_public must be true or false')
      await ctx.db.patch(r._id, { isPublic: data.is_public }); await aggregate(ctx, r.caregiverId)
      await ctx.db.insert('reports', { reporterId: a._id, reportedAccountId: r.employerAccountId, reason: 'review_moderation', details: `Review #${externalId(r)}: visibility set to ${data.is_public}`, status: 'resolved', createdAt: Date.now() })
      return { review_id: externalId(r), is_public: data.is_public }
    }
    if ((match = path.match(/^\/admin\/reports\/([^/]+)$/)) && method === 'PUT') {
      const r = await find(ctx, 'reports', match[1]); if (!['open', 'reviewed', 'resolved'].includes(data.status)) fail('Select a valid report status')
      await ctx.db.patch(r._id, { status: data.status }); return { id: externalId(r), status: data.status }
    }
  }
  fail('This action is unavailable', 404)
} })
