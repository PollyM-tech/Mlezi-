import { internalMutation } from './_generated/server.js'
import { internal } from './_generated/api.js'
const DAY = 86400000
export const sweep = internalMutation({ args: {}, handler: async ctx => {
  for (const r of await ctx.db.query('rateLimits').collect()) if (r.resetAt < Date.now() - DAY) await ctx.db.delete(r._id)
  for (const r of await ctx.db.query('authEmailLimits').collect()) if (r.lastSentAt < Date.now() - 7 * DAY) await ctx.db.delete(r._id)
  for (const r of await ctx.db.query('securityAudit').withIndex('by_created', q => q.lt('createdAt', Date.now() - 90 * DAY)).take(500)) await ctx.db.delete(r._id)
  for (const r of await ctx.db.query('adminSessions').collect()) if (r.expiresAt < Date.now()) await ctx.db.delete(r._id)
  for (const r of await ctx.db.query('accounts').collect()) if (r.deletionRequestedAt && r.deletionRequestedAt + 7 * DAY <= Date.now() && r.authSubject) await ctx.scheduler.runAfter(0, internal.privacy.purge, { accountId: r._id })
  for (const s of await ctx.db.query('verificationSubmissions').collect()) {
    if (s.status === 'pending' && s.submittedAt < Date.now() - 30 * DAY) {
      if (s.selfie?.provider === 'convex') await ctx.storage.delete(s.selfie.storageId)
      await ctx.db.patch(s._id, { status: 'rejected', rejectionReason: 'This identity request expired after 30 days. Submit a fresh selfie.', reviewedAt: Date.now(), selfie: undefined })
      const profile = await ctx.db.get(s.caregiverId)
      if (profile?.identityStatus === 'pending') await ctx.db.patch(profile._id, { identityStatus: 'unverified', adultConfirmedAt: undefined })
      continue
    }
    if (s.status === 'pending' || !s.reviewedAt || s.reviewedAt > Date.now() - 30 * DAY) continue
    const p = await ctx.db.get(s.caregiverId)
    for (const a of [s.selfie, s.legacyGoodConduct, s.profilePhoto?.storageId !== p?.photo?.storageId ? s.profilePhoto : undefined]) if (a?.provider === 'convex') await ctx.storage.delete(a.storageId)
    await ctx.db.patch(s._id, { selfie: undefined, legacyGoodConduct: undefined, profilePhoto: undefined })
  }
} })
