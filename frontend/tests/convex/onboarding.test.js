import { afterEach, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'
const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
const DAY = 86400000
const work = { name: 'Njeri', area: 'Kilimani, Nairobi', experience: 2, category: 'nanny', arrangement: 'live_out' }
async function person(t, suffix = 'nanny', role = 'caregiver') {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: `${suffix}@example.test`, emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 30 * DAY })
    const accountId = await ctx.db.insert('accounts', { authSubject: userId, role, email: `${suffix}@example.test`, phone: '0712345678', name: work.name, createdAt: Date.now(), termsVersion: LEGAL_VERSION, termsAcceptedAt: Date.now() })
    if (role === 'employer') await ctx.db.insert('employers', { accountId })
    return { userId, sessionId, accountId }
  })
  return { ...ids, client: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }) }
}
async function image(t, who, purpose) {
  return t.run(async ctx => {
    const storageId = await ctx.storage.store(new Blob(['test image'], { type: 'image/jpeg' }))
    await ctx.db.insert('uploadedAssets', { storageId, accountId: who.accountId, purpose, claimed: false, createdAt: Date.now() })
    return storageId
  })
}
afterEach(() => { vi.restoreAllMocks() })
it('saves work privately, isolates drafts and rejects public or wrong-role access', async () => {
  const t = make(), who = await person(t), other = await person(t, 'other'), employer = await person(t, 'parent', 'employer')
  await expect(t.query(api.onboarding.current)).rejects.toThrow('sign in')
  await who.client.mutation(api.onboarding.saveWork, { work })
  expect(await who.client.query(api.onboarding.current)).toMatchObject({ work, uploaded: { photo: false, national_id: false, selfie: false } })
  expect(await other.client.query(api.onboarding.current)).toBeNull()
  await expect(employer.client.mutation(api.onboarding.saveWork, { work })).rejects.toThrow('permission')
  expect(await t.run(ctx => ctx.db.query('caregivers').collect())).toHaveLength(0)
  expect((await employer.client.query(api.marketplace.read, { path: '/caregivers' })).profiles).toHaveLength(0)
  await expect(who.client.mutation(api.onboarding.saveWork, { work: { ...work, area: 'Call 0712345678' } })).rejects.toThrow('private contact')
})
it('requires owned, correctly purposed uploads and consent, then submits only complete evidence', async () => {
  const t = make(), who = await person(t), other = await person(t, 'other')
  await who.client.mutation(api.onboarding.saveWork, { work })
  const alien = await image(t, other, 'photo'), photo = await image(t, who, 'photo')
  await expect(who.client.mutation(api.onboarding.attach, { storageId: alien, purpose: 'photo', consent: true })).rejects.toThrow('belonging')
  await expect(who.client.mutation(api.onboarding.attach, { storageId: photo, purpose: 'selfie', consent: true })).rejects.toThrow('belonging')
  await expect(who.client.mutation(api.onboarding.attach, { storageId: photo, purpose: 'photo', consent: false })).rejects.toThrow('permission')
  await who.client.mutation(api.onboarding.attach, { storageId: photo, purpose: 'photo', consent: true })
  await expect(who.client.mutation(api.onboarding.submit, { consent: true })).rejects.toThrow('all three')
  for (const purpose of ['national_id', 'selfie']) await who.client.mutation(api.onboarding.attach, { storageId: await image(t, who, purpose), purpose, consent: true })
  const pendingDraft = await t.run(ctx => ctx.db.query('onboardingDrafts').first())
  // Saved uploads survive the former one-hour orphan window without opening reuse by another account.
  const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 2 * 3600000)
  await expect(who.client.mutation(api.onboarding.submit, { consent: false })).rejects.toThrow('permission')
  const result = await who.client.mutation(api.onboarding.submit, { consent: true })
  expect(result.profile).toMatchObject({ name: work.name, location: work.area, verification_status: 'pending', adult_confirmed: false })
  const draft = await t.run(ctx => ctx.db.query('onboardingDrafts').first())
  expect(draft).toBeNull()
  const submission = await t.run(ctx => ctx.db.query('verificationSubmissions').first())
  expect(submission.selfie).toBeTruthy(); expect(submission.consentAt).toBeTypeOf('number')
  vi.spyOn(Date, 'now').mockReturnValue(now + 8 * DAY)
  await t.mutation(internal.onboarding.expire, { id: pendingDraft._id })
  expect(await t.run(ctx => ctx.db.system.get(photo))).toBeTruthy()
})
it('expires incomplete evidence, and stale expiry jobs do not erase adopted images', async () => {
  const t = make(), who = await person(t)
  await who.client.mutation(api.onboarding.saveWork, { work })
  const photo = await image(t, who, 'photo')
  await who.client.mutation(api.onboarding.attach, { storageId: photo, purpose: 'photo', consent: true })
  const draft = await t.run(ctx => ctx.db.query('onboardingDrafts').first())
  const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 8 * DAY)
  expect(await who.client.query(api.onboarding.current)).toBeNull()
  await t.mutation(internal.onboarding.expire, { id: draft._id })
  expect(await t.run(ctx => ctx.db.system.get(photo))).toBeNull()
  expect(await t.run(ctx => ctx.db.get(draft._id))).toBeNull()
})
it('account deletion erases private onboarding files and work details', async () => {
  const t = make(), who = await person(t)
  await who.client.mutation(api.onboarding.saveWork, { work })
  const photo = await image(t, who, 'photo')
  await who.client.mutation(api.onboarding.attach, { storageId: photo, purpose: 'photo', consent: true })
  expect((await who.client.mutation(api.privacy.exportOwn)).unfinishedProfile.work).toEqual(work)
  await who.client.mutation(api.privacy.request, { type: 'deletion', details: 'Delete account', confirmEmail: 'nanny@example.test' })
  const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 3 * 3600000)
  await t.mutation(internal.privacy.purge, { accountId: who.accountId })
  expect(await t.run(ctx => ctx.db.query('onboardingDrafts').first())).toBeNull()
  expect(await t.run(ctx => ctx.db.system.get(photo))).toBeNull()
})

it('replaces a saved image without retaining the obsolete private file', async()=>{
 const t=make(),who=await person(t)
 await who.client.mutation(api.onboarding.saveWork,{work})
 const first=await image(t,who,'photo'),second=await image(t,who,'photo')
 await who.client.mutation(api.onboarding.attach,{purpose:'photo',storageId:first,consent:true})
 await who.client.mutation(api.onboarding.attach,{purpose:'photo',storageId:second,consent:true})
 expect(await t.run(ctx=>ctx.db.system.get(first))).toBeNull()
 expect(await t.run(ctx=>ctx.db.system.get(second))).toBeTruthy()
 expect((await who.client.query(api.onboarding.current)).uploaded.photo).toBe(true)
})
