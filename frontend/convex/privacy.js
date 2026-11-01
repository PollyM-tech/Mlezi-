import { query, mutation, internalMutation } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { verifiedIdentity, requireAccount } from './lib/permissions.js'
import { audit, consume } from './lib/security.js'
import { fail, text } from './lib/marketplace.js'
const DAY = 86400000
async function own(ctx) {
  const identity = await verifiedIdentity(ctx)
  const a = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
  if (!a) fail('Complete your account first', 403)
  return a
}
export const status = query({ args: {}, handler: async ctx => {
  const a = await own(ctx)
  return { deletionRequestedAt: a.deletionRequestedAt || null, requests: (await ctx.db.query('dataRequests').withIndex('by_account', q => q.eq('accountId', a._id)).collect()).map(r => ({ id: r._id, type: r.type, status: r.status, createdAt: r.createdAt })) }
} })
export const exportOwn = mutation({ args: {}, handler: async ctx => {
  const a = await own(ctx); await consume(ctx, `export:${a._id}`, 3, 86400000)
  const caregiver = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  const employer = await ctx.db.query('employers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  const strip = row => row ? Object.fromEntries(Object.entries(row).filter(([key]) => !['_id','_creationTime','accountId','authSubject','photo','nationalId','selfie','profilePhoto','legacyGoodConduct'].includes(key))) : null
  const payments = await ctx.db.query('payments').withIndex('by_account', q => q.eq('accountId', a._id)).collect()
  const reviews = await ctx.db.query('reviews').withIndex('by_pair', q => q.eq('employerAccountId', a._id)).collect()
  await audit(ctx, a._id, 'personal_data_export')
  return { exportedAt: Date.now(), account: { email: a.email, phone: a.phone || null, name: a.name || null, role: a.role }, profile: strip(caregiver || employer), payments: payments.map(strip), reviewsWritten: reviews.map(strip),
    shortlist: employer ? (await ctx.db.query('shortlists').withIndex('by_pair', q => q.eq('employerId', employer._id)).collect()).map(r => ({ caregiverId: r.caregiverId, createdAt: r.createdAt })) : [],
    contactUnlocks: employer ? (await ctx.db.query('contactUnlocks').withIndex('by_pair', q => q.eq('employerId', employer._id)).collect()).map(r => ({ caregiverId: r.caregiverId, unlockedAt: r.unlockedAt })) : [],
    identityRequests: caregiver ? (await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', caregiver._id)).collect()).map(strip) : [],
    supportTickets: await Promise.all((await ctx.db.query('supportTickets').withIndex('by_account', q => q.eq('accountId', a._id)).collect()).map(async ticket => ({ id: ticket._id, subject: ticket.subject, category: ticket.category, status: ticket.status, createdAt: ticket.createdAt, messages: (await ctx.db.query('supportMessages').withIndex('by_ticket', q => q.eq('ticketId', ticket._id)).take(100)).map(m => ({ sender: m.sender, body: m.body, createdAt: m.createdAt })) }))),
    note: 'This portable account export excludes credentials, private file identifiers, and other users’ private contact details. Use a correction request for a copy of your identity evidence or any additional personal records.' }
} })
export const request = mutation({ args: { type: v.union(v.literal('deletion'), v.literal('correction')), details: v.string(), confirmEmail: v.optional(v.string()) }, handler: async (ctx, args) => {
  const a = await own(ctx)
  await consume(ctx, `privacy:${a._id}`, 5, 86400000)
  if (args.type === 'deletion') {
    if (a.role === 'admin') fail('An operator must transfer administrator responsibility before deleting this account.')
    if (args.confirmEmail?.trim().toLowerCase() !== a.email) fail('Enter your email address to confirm deletion')
    if (a.deletionRequestedAt) return { ok: true }
    await ctx.db.patch(a._id, { deletionRequestedAt: Date.now() })
    const p = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
    if (p) await ctx.db.patch(p._id, { isAvailable: false })
    await ctx.scheduler.runAfter(7 * DAY, internal.privacy.purge, { accountId: a._id })
  }
  await ctx.db.insert('dataRequests', { accountId: a._id, type: args.type, details: text(args.details, 'request details', 2000), status: 'open', createdAt: Date.now() })
  await audit(ctx, a._id, `privacy_${args.type}_requested`)
  return { ok: true }
} })
export const cancelDeletion = mutation({ args: {}, handler: async ctx => {
  const a = await own(ctx)
  if (!a.deletionRequestedAt) return
  await ctx.db.patch(a._id, { deletionRequestedAt: undefined })
  for (const r of await ctx.db.query('dataRequests').withIndex('by_account', q => q.eq('accountId', a._id)).collect()) if (r.type === 'deletion' && r.status === 'open') await ctx.db.patch(r._id, { status: 'resolved' })
  await audit(ctx, a._id, 'privacy_deletion_cancelled')
} })
export const requests = query({ args: {}, handler: async ctx => { await requireAccount(ctx, 'admin'); return (await ctx.db.query('dataRequests').withIndex('by_status', q => q.eq('status', 'open')).take(100)).map(r => ({ ...r, accountId: String(r.accountId) })) } })
export const resolve = mutation({ args: { id: v.id('dataRequests') }, handler: async (ctx, { id }) => { const a = await requireAccount(ctx, 'admin'); const r = await ctx.db.get(id); if (!r || r.type === 'deletion') fail('Deletion requests are completed by the retention worker'); await ctx.db.patch(id, { status: 'resolved' }); await audit(ctx, a._id, 'privacy_request_resolved', id) } })
export const purge = internalMutation({ args: { accountId: v.id('accounts') }, handler: async (ctx, { accountId }) => {
  const a = await ctx.db.get(accountId)
  if (!a?.deletionRequestedAt || a.deletionRequestedAt + 7 * DAY > Date.now()) return
  for (const ticket of await ctx.db.query('supportTickets').withIndex('by_account', q => q.eq('accountId', accountId)).collect()) {
    for (const message of await ctx.db.query('supportMessages').withIndex('by_ticket', q => q.eq('ticketId', ticket._id)).take(100)) await ctx.db.delete(message._id)
    await ctx.db.delete(ticket._id)
  }
  const assets = new Set(), asset = value => { if (value?.provider === 'convex') assets.add(value.storageId) }
  const caregiver = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', accountId)).unique()
  const employer = await ctx.db.query('employers').withIndex('by_account', q => q.eq('accountId', accountId)).unique()
  if (caregiver) {
    asset(caregiver.photo)
    for (const row of await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', caregiver._id)).collect()) { asset(row.nationalId); await ctx.db.delete(row._id) }
    for (const row of await ctx.db.query('verificationSubmissions').withIndex('by_caregiver', q => q.eq('caregiverId', caregiver._id)).collect()) { asset(row.selfie); asset(row.profilePhoto); asset(row.legacyGoodConduct); await ctx.db.delete(row._id) }
    for (const row of await ctx.db.query('reviews').withIndex('by_caregiver_public', q => q.eq('caregiverId', caregiver._id)).collect()) await ctx.db.delete(row._id)
  }
  for (const table of ['contactUnlocks','shortlists']) {
    for (const r of await ctx.db.query(table).collect()) if (r.employerId === employer?._id || r.caregiverId === caregiver?._id) await ctx.db.delete(r._id)
  }
  for (const r of await ctx.db.query('reviews').withIndex('by_pair', q => q.eq('employerAccountId', accountId)).collect()) await ctx.db.patch(r._id, { authorName: 'Former employer', comment: '[Removed following an account deletion request]', reply: undefined })
  for (const r of await ctx.db.query('uploadedAssets').collect()) if (r.accountId === accountId) { assets.add(r.storageId); await ctx.db.delete(r._id) }
  for (const id of assets) await ctx.storage.delete(id)
  if (caregiver) await ctx.db.delete(caregiver._id)
  if (employer) await ctx.db.delete(employer._id)
  if (a.authSubject) {
    const userId = ctx.db.normalizeId('users', a.authSubject)
    if (userId) {
      const sessions = await ctx.db.query('authSessions').withIndex('userId', q => q.eq('userId', userId)).collect()
      for (const s of sessions) { for (const token of await ctx.db.query('authRefreshTokens').withIndex('sessionId', q => q.eq('sessionId', s._id)).collect()) await ctx.db.delete(token._id); await ctx.db.delete(s._id) }
      for (const r of await ctx.db.query('authAccounts').withIndex('userIdAndProvider', q => q.eq('userId', userId)).collect()) { for (const c of await ctx.db.query('authVerificationCodes').withIndex('accountId', q => q.eq('accountId', r._id)).collect()) await ctx.db.delete(c._id); await ctx.db.delete(r._id) }
      for (const r of await ctx.db.query('authVerifiers').collect()) if (r.sessionId && sessions.some(s => s._id === r.sessionId)) await ctx.db.delete(r._id)
      if (await ctx.db.get(userId)) await ctx.db.delete(userId)
    }
  }
  for (const r of await ctx.db.query('reports').collect()) if (r.reporterId === accountId || r.reportedAccountId === accountId) await ctx.db.patch(r._id, { details: '[Personal details removed after account deletion]' })
  for (const p of await ctx.db.query('payments').withIndex('by_account', q => q.eq('accountId', accountId)).collect()) await ctx.db.patch(p._id, { phone: undefined, resultDescription: undefined })
  // Keep only a pseudonymous account key for financial/audit referential history.
  await ctx.db.patch(accountId, { email: `deleted-${accountId}@deleted.invalid`, name: 'Deleted account', phone: undefined, authSubject: undefined, legacyId: undefined, suspendedAt: Date.now(), suspensionReason: undefined })
  for (const r of await ctx.db.query('dataRequests').withIndex('by_account', q => q.eq('accountId', accountId)).collect()) await ctx.db.patch(r._id, { details: undefined, status: 'resolved' })
  await audit(ctx, undefined, 'account_personal_data_purged', accountId)
} })
