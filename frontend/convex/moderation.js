import { query, mutation } from './_generated/server.js'
import { v } from 'convex/values'
import { requireAccount } from './lib/permissions.js'
import { find, fail, text } from './lib/marketplace.js'
import { audit, consume } from './lib/security.js'
export const reportProfile = mutation({ args: { caregiverId: v.string(), reason: v.string() }, handler: async (ctx, args) => {
  const a = await requireAccount(ctx, 'employer','caregiver'); await consume(ctx, `reports:${a._id}`, 5, 3600000)
  const p = await find(ctx, 'caregivers', args.caregiverId)
  if (p.accountId === a._id) fail('You cannot report your own profile')
  await ctx.db.insert('reports', { reporterId: a._id, reportedAccountId: p.accountId, reason: 'profile_safety', details: text(args.reason, 'a report reason', 1000, true), status: 'open', createdAt: Date.now() })
  return { ok: true }
} })
export const users = query({ args: {}, handler: async ctx => { await requireAccount(ctx,'admin'); return (await ctx.db.query('accounts').order('desc').take(100)).map(a => ({ id: a._id, name: a.name || a.email, role: a.role, suspended: !!a.suspendedAt, deletionPending: !!a.deletionRequestedAt })) } })
export const suspend = mutation({ args: { accountId: v.id('accounts'), suspended: v.boolean(), reason: v.string() }, handler: async (ctx,args) => {
  const admin = await requireAccount(ctx,'admin'), a = await ctx.db.get(args.accountId)
  if (!a || a.role === 'admin' || a.deletionRequestedAt) fail('This account cannot be changed here')
  const reason = text(args.reason,'a suspension reason',1000,args.suspended)
  await ctx.db.patch(a._id,{ suspendedAt: args.suspended ? Date.now() : undefined, suspensionReason: args.suspended ? reason : undefined })
  const profile = await ctx.db.query('caregivers').withIndex('by_account',q=>q.eq('accountId',a._id)).unique()
  if (profile && args.suspended) await ctx.db.patch(profile._id,{isAvailable:false})
  if (args.suspended && a.authSubject) {
    const userId = ctx.db.normalizeId('users',a.authSubject)
    if(userId) for(const s of await ctx.db.query('authSessions').withIndex('userId',q=>q.eq('userId',userId)).collect()) {
      for(const r of await ctx.db.query('authRefreshTokens').withIndex('sessionId',q=>q.eq('sessionId',s._id)).collect()) await ctx.db.delete(r._id)
      await ctx.db.delete(s._id)
    }
  }
  await audit(ctx,admin._id,args.suspended?'account_suspended':'account_restored',a._id)
} })
export const auditLog = query({ args: {}, handler: async ctx => { await requireAccount(ctx,'admin'); return ctx.db.query('securityAudit').withIndex('by_created').order('desc').take(100) } })

export const reportAccount = mutation({ args: { email: v.string(), reason: v.string() }, handler: async (ctx,args) => {
  const a=await requireAccount(ctx,'employer','caregiver');await consume(ctx,`reports:${a._id}`,5,3600000)
  const email=text(args.email,'an email address',255,true).toLowerCase(), reason=text(args.reason,'a safety report',1000,true)
  const target=await ctx.db.query('accounts').withIndex('by_email',q=>q.eq('email',email)).unique()
  // Identical response for unknown addresses prevents account enumeration.
  await ctx.db.insert('reports',{reporterId:a._id,reportedAccountId:target?._id||a._id,reason:'account_safety',details:`Reported email: ${email}. ${reason}`,status:'open',createdAt:Date.now()})
  return {ok:true}
} })
