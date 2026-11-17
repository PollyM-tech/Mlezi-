import { query, mutation, internalMutation } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { accountIdentity } from './lib/permissions.js'
import { assertNoContact } from './lib/contactPolicy.js'
import { fail, text } from './lib/marketplace.js'
import { saveProfile } from './lib/profileSetup.js'
import { consume, audit } from './lib/security.js'

const TTL = 7 * 86400000
const purposes = ['photo', 'national_id', 'selfie']
const purpose = v.union(...purposes.map(value => v.literal(value)))
const work = v.object({ name: v.string(), area: v.string(), experience: v.number(), category: v.union(v.literal('nanny'), v.literal('babysitter')), arrangement: v.union(...['live_in', 'live_out', 'occasional_backup', 'overnight', 'travel'].map(value => v.literal(value))) })
async function own(ctx) {
  const account = await accountIdentity(ctx, 'caregiver')
  if (await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', account._id)).unique()) fail('Use your profile to update an existing account', 409)
  return account
}
const draftFor = (ctx, id) => ctx.db.query('onboardingDrafts').withIndex('by_account', q => q.eq('accountId', id)).unique()
async function remove(ctx, draft) {
  for (const kind of purposes) if (draft[kind]) {
    await ctx.storage.delete(draft[kind])
    const upload = await ctx.db.query('uploadedAssets').withIndex('by_storage', q => q.eq('storageId', draft[kind])).unique()
    if (upload) await ctx.db.delete(upload._id)
  }
  await ctx.db.delete(draft._id)
}
async function extend(ctx, accountId, fields) {
  let old = await draftFor(ctx, accountId)
  if (old && old.expiresAt <= Date.now()) { await remove(ctx, old); old = null }
  const updatedAt = Date.now(), expiresAt = updatedAt + TTL
  const id = old?._id || await ctx.db.insert('onboardingDrafts', { accountId, updatedAt, expiresAt })
  await ctx.db.patch(id, { ...fields, updatedAt, expiresAt })
  await ctx.scheduler.runAfter(TTL, internal.onboarding.expire, { id })
  return id
}
export const current = query({ args: {}, handler: async ctx => {
  const a = await accountIdentity(ctx, 'caregiver'), draft = await draftFor(ctx, a._id)
  if (!draft || draft.expiresAt <= Date.now()) return null
  return { work: draft.work || null, uploaded: Object.fromEntries(await Promise.all(purposes.map(async kind => [kind, !!draft[kind] && !!await ctx.db.system.get(draft[kind])])) ), expiresAt: draft.expiresAt }
} })
export const saveWork = mutation({ args: { work }, handler: async (ctx, { work }) => {
  const a = await own(ctx)
  await consume(ctx, `onboarding-work:${a._id}`, 30, 3600000)
  const clean = { ...work, name: text(work.name, 'your name', 120, true), area: text(work.area, 'your area or town', 120, true) }
  if (!Number.isInteger(clean.experience) || clean.experience < 0 || clean.experience > 80) fail('Enter years of experience from 0 to 80')
  assertNoContact([clean.name, clean.area])
  await extend(ctx, a._id, { work: clean })
  return { saved: true }
} })
export const attach = mutation({ args: { purpose, storageId: v.id('_storage'), consent: v.boolean() }, handler: async (ctx, args) => {
  const a = await own(ctx)
  await consume(ctx, `onboarding-files:${a._id}`, 20, 3600000)
  if (!args.consent) fail('Confirm permission before uploading identity evidence')
  const draft = await draftFor(ctx, a._id)
  if (!draft?.work || draft.expiresAt <= Date.now()) fail('Save your work details before uploading photos')
  const asset = await ctx.db.query('uploadedAssets').withIndex('by_storage', q => q.eq('storageId', args.storageId)).unique()
  if (!asset || asset.accountId !== a._id || asset.purpose !== args.purpose || asset.claimed || asset.createdAt + 3600000 <= Date.now() || !await ctx.db.system.get(args.storageId)) fail('Upload a fresh image belonging to your account', 403)
  const previous = draft[args.purpose]
  if (previous) {
    await ctx.storage.delete(previous)
    const old = await ctx.db.query('uploadedAssets').withIndex('by_storage', q => q.eq('storageId', previous)).unique()
    if (old) await ctx.db.delete(old._id)
  }
  await ctx.db.patch(asset._id, { claimed: true })
  await extend(ctx, a._id, { [args.purpose]: args.storageId, consentAt: Date.now() })
  return { saved: true }
} })
export const submit = mutation({ args: { consent: v.boolean() }, handler: async (ctx, { consent }) => {
  const a = await own(ctx), draft = await draftFor(ctx, a._id)
  if (!consent || !draft?.consentAt) fail('Confirm permission to compare your ID, selfie and profile photo')
  if (!draft?.work || draft.expiresAt <= Date.now() || purposes.some(kind => !draft[kind])) fail('Complete your work details and all three photos before submitting')
  for (const kind of purposes) if (!await ctx.db.system.get(draft[kind])) fail('A saved photo is missing. Please upload it again before submitting.')
  await consume(ctx, `onboarding-submit:${a._id}`, 5, 3600000)
  const w = draft.work
  const result = await saveProfile(ctx, { name: w.name, location: w.area, years_experience: w.experience, service_category: w.category, service_types: [w.arrangement], phone: a.phone, photo: draft.photo, national_id: draft.national_id, selfie: draft.selfie, consent: 'true' }, true)
  await ctx.db.delete(draft._id)
  return result
} })
export const expire = internalMutation({ args: { id: v.id('onboardingDrafts') }, handler: async (ctx, { id }) => {
  const draft = await ctx.db.get(id)
  if (draft && draft.expiresAt <= Date.now()) { await remove(ctx, draft); await audit(ctx, undefined, 'onboarding_draft_expired', draft.accountId) }
} })
