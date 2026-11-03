import { hasProfilePhoto } from './permissions.js'
import { approvedAdult } from './marketplace.js'

async function present(ctx, asset) {
  return !!asset && (asset.provider === 'convex' ? !!await ctx.db.system.get(asset.storageId) : !!asset.publicId)
}
// Publication and identity approval are separate. Pending listings disclose no ID,
// selfie, contact or verified-adult claim; contact access still requires approval.
export async function canPublish(ctx, profile, account) {
  if (!profile || profile.isVisible === false || !account || account.role !== 'caregiver' || account.suspendedAt || account.deletionRequestedAt || !await hasProfilePhoto(ctx, account)) return false
  if (approvedAdult(profile)) return true
  if (profile.identityStatus !== 'pending' || typeof account.termsAcceptedAt !== 'number' || !account.termsVersion) return false
  const submission = await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', profile._id)).filter(q => q.eq(q.field('status'), 'pending')).order('desc').first()
  const documents = await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', profile._id)).unique()
  return !!submission && JSON.stringify(submission.profilePhoto) === JSON.stringify(profile.photo) && await present(ctx, submission.selfie) && await present(ctx, documents?.nationalId)
}
