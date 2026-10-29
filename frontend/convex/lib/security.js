import { ConvexError } from 'convex/values'

export async function consume(ctx, key, maximum, windowMs, cost = 1) {
  const now = Date.now()
  const old = await ctx.db.query('rateLimits').withIndex('by_key', q => q.eq('key', key)).unique()
  const count = old && old.resetAt > now ? old.count : 0
  if (count + cost > maximum) throw new ConvexError({ message: 'Too many requests. Please wait and try again.', status: 429 })
  if (old) await ctx.db.patch(old._id, { count: count + cost, resetAt: old.resetAt > now ? old.resetAt : now + windowMs })
  else await ctx.db.insert('rateLimits', { key, count: cost, resetAt: now + windowMs })
}
export async function audit(ctx, actorId, action, targetId) {
  await ctx.db.insert('securityAudit', { ...(actorId ? { actorId } : {}), action, ...(targetId ? { targetId: String(targetId) } : {}), createdAt: Date.now() })
}
export const bytes64 = bytes => btoa(String.fromCharCode(...bytes))
export const from64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0))
