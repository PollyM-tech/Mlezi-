import { internalMutation } from './_generated/server.js'
import { consume as budget } from './lib/security.js'
import { v, ConvexError } from 'convex/values'

export const consume = internalMutation({ args: { email: v.string() }, handler: async (ctx, { email }) => {
  await budget(ctx, 'email-global-minute', 20, 60000)
  await budget(ctx, 'email-global-day', 200, 86400000)
  const now = Date.now()
  const existing = await ctx.db.query('authEmailLimits').withIndex('by_email', q => q.eq('email', email)).unique()
  if (existing && (now - existing.lastSentAt < 60000 || now - existing.windowStartedAt < 3600000 && existing.count >= 5)) {
    throw new ConvexError('Please wait before requesting another email. You can request up to five per hour.')
  }
  const reset = !existing || now - existing.windowStartedAt >= 3600000
  const data = { email, lastSentAt: now, windowStartedAt: reset ? now : existing.windowStartedAt, count: reset ? 1 : existing.count + 1 }
  if (existing) await ctx.db.patch(existing._id, data)
  else await ctx.db.insert('authEmailLimits', data)
} })
