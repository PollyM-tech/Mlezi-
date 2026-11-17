import { accountIdentity, hasProfilePhoto } from './permissions.js'
import { fail, find, phone, profileFields, publicProfile } from './marketplace.js'
import { assertNoContact, PROFILE_TEXT_FIELDS } from './contactPolicy.js'
import { audit } from './security.js'

export async function claimAsset(ctx, id, accountId, purpose) {
  const storageId = ctx.db.system.normalizeId('_storage', String(id))
  if (!storageId) fail('Upload a valid image')
  const asset = await ctx.db.query('uploadedAssets').withIndex('by_storage', q => q.eq('storageId', storageId)).unique()
  const draft = asset?.claimed ? await ctx.db.query('onboardingDrafts').withIndex('by_account', q => q.eq('accountId', accountId)).unique() : null
  const reserved = draft && draft.expiresAt > Date.now() && draft[purpose] === storageId
  if (!asset || asset.accountId !== accountId || asset.purpose !== purpose || asset.claimed && !reserved || !reserved && asset.createdAt + 3600000 < Date.now()) fail('Upload a fresh image belonging to your account', 403)
  await ctx.db.patch(asset._id, { claimed: true })
  return { provider: 'convex', storageId }
}
export async function saveProfile(ctx, data, creating, requestedId) {
  const a = await accountIdentity(ctx, 'caregiver')
  const old = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  if (creating && old) fail('Nanny or babysitter profile already exists', 409)
  if (!creating && !old) fail('Nanny or babysitter profile not found', 404)
  if (requestedId && (await find(ctx, 'caregivers', requestedId))._id !== old?._id) fail('You can only edit your own profile', 403)
  const fields = profileFields(data, old), contactPhone = data.phone === undefined ? a.phone : phone(data.phone)
  assertNoContact(PROFILE_TEXT_FIELDS.map(key => fields[key]))
  if (creating && (!data.photo || !data.national_id || !data.selfie)) fail('Profile photo, National ID and selfie are required')
  if (creating && data.consent !== 'true') fail('Confirm permission to compare your ID, selfie and profile photo')
  const oldDocuments = old ? await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', old._id)).unique() : null
  const storedId = oldDocuments?.nationalId && (oldDocuments.nationalId.provider !== 'convex' || await ctx.db.system.get(oldDocuments.nationalId.storageId))
  const repairingId = !creating && !storedId && !!data.national_id
  if (!creating && data.national_id && storedId) fail('National ID replacement requires administrator assistance')
  if (repairingId && (!data.selfie || data.consent !== 'true')) fail('Upload a recent selfie and confirm permission to review your missing ID')
  if (data.photo) fields.photo = await claimAsset(ctx, data.photo, a._id, 'photo')
  if (fields.photo) fields.photoUrl = '' // URLs are resolved in public projections.
  let nationalId
  if (data.national_id) nationalId = await claimAsset(ctx, data.national_id, a._id, 'national_id')
  if (old) {
    if ((fields.photo || fields.name !== old.name) && ['pending', 'verified'].includes(old.identityStatus)) {
      fields.identityStatus = 'unverified'
      fields.adultConfirmedAt = undefined
      await audit(ctx, a._id, 'identity_invalidated_profile_change', old._id)
      const pending = await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', old._id)).filter(q => q.eq(q.field('status'), 'pending')).collect()
      for (const s of pending) await ctx.db.patch(s._id, { status: 'rejected', rejectionReason: 'Your name or profile photo changed. Please submit a new identity check.', reviewedAt: Date.now() })
    }
    await ctx.db.patch(old._id, { ...fields, updatedAt: Date.now() })
  }
  const id = old?._id || await ctx.db.insert('caregivers', { ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), identityStatus: 'unverified', ratingAverage: 0, reviewCount: 0, createdAt: Date.now(), updatedAt: Date.now(), accountId: a._id })
  if (nationalId) {
    if (oldDocuments) await ctx.db.patch(oldDocuments._id, { nationalId, purgedAt: undefined })
    else await ctx.db.insert('caregiverDocuments', { caregiverId: id, nationalId })
  }
  if (creating || repairingId) {
    if (repairingId) for (const prior of await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', id)).filter(q => q.eq(q.field('status'), 'pending')).collect()) await ctx.db.patch(prior._id, { status: 'rejected', rejectionReason: 'Missing identity evidence was restored; review the new submission.', reviewedAt: Date.now() })
    const selfie = await claimAsset(ctx, data.selfie, a._id, 'selfie')
    const profile = await ctx.db.get(id)
    await ctx.db.insert('verificationSubmissions', { caregiverId: id, selfie, profileName: profile.name, profilePhoto: profile.photo, status: 'pending', consentAt: Date.now(), submittedAt: Date.now() })
    await ctx.db.patch(id, { identityStatus: 'pending', adultConfirmedAt: undefined })
    await audit(ctx, a._id, 'identity_submitted', id)
  }
  if (!await hasProfilePhoto(ctx, a)) fail('A profile photo is required')
  await ctx.db.patch(a._id, { name: fields.name, phone: contactPhone })
  return { profile: await publicProfile(ctx, await ctx.db.get(id), { ...a, phone: contactPhone }) }
}

