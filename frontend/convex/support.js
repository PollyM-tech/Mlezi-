import { query, mutation, internalMutation } from './_generated/server.js'
import { v } from 'convex/values'
import { internal } from './_generated/api.js'
import { verifiedIdentity, requireAccount } from './lib/permissions.js'
import { audit, consume } from './lib/security.js'
import { fail, text, DAY } from './lib/marketplace.js'
import { enqueue } from './supportEmail.js'

const status = v.union(v.literal('open'), v.literal('waiting'), v.literal('resolved'))
export const categories = ['account', 'profile', 'identity', 'membership', 'technical', 'safety', 'privacy', 'other']
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('')
}
export async function keyHash(key) {
  if (!/^[a-f0-9]{64}$/.test(key)) fail('Ticket reference or access key is incorrect', 404)
  return digest(key)
}
async function owner(ctx) {
  const identity = await verifiedIdentity(ctx)
  const a = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
  if (!a) fail('Complete your account first', 403)
  // Support remains available during profile setup, suspension and deletion grace.
  if (a.role === 'admin') await requireAccount(ctx, 'admin')
  return a
}
async function access(ctx, id, key) {
  const ticket = await ctx.db.get(id)
  if (key !== undefined) {
    const hash = await keyHash(key)
    if (!ticket?.guestKeyHash || ticket.guestKeyHash !== hash) fail('Ticket reference or access key is incorrect', 404)
    return { ticket, admin: false }
  }
  const a = await owner(ctx)
  if (!ticket || ticket.accountId !== a._id && a.role !== 'admin') fail('Ticket not found', 404)
  return { ticket, admin: a.role === 'admin', account: a }
}
function summary(t) { return { id: t._id, subject: t.subject, category: t.category, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt, followUpDueAt: t.createdAt + 2 * DAY } }
export async function insertTicket(ctx, data) {
  const subject = text(data.subject, 'a subject', 120, true), body = text(data.body, 'your message', 2000, true)
  if (!categories.includes(data.category)) fail('Choose a support category')
  const now = Date.now()
  const id = await ctx.db.insert('supportTickets', { ...data.accountId ? { accountId: data.accountId } : { guestKeyHash: data.guestKeyHash, ...(data.guestEmail ? { guestEmail: data.guestEmail } : {}) }, subject, category: data.category, status: 'open', messageCount: 1, createdAt: now, updatedAt: now })
  await ctx.db.insert('supportMessages', { ticketId: id, sender: 'customer', body, createdAt: now })
  await audit(ctx, data.accountId, 'support_ticket_created', id)
  return id
}
export const create = mutation({ args: { subject: v.string(), category: v.string(), body: v.string() }, handler: async (ctx, args) => {
  const a = await owner(ctx)
  await consume(ctx, `support-create:${a._id}`, 5, DAY)
  return { id: await insertTicket(ctx, { ...args, accountId: a._id }) }
} })
export const createGuest = internalMutation({ args: { subject: v.string(), category: v.string(), body: v.string(), guestKeyHash: v.string(), guestEmail: v.optional(v.string()) }, handler: async (ctx, args) => {
  await consume(ctx, 'support-guest-global', 100, DAY)
  if (args.guestEmail) await consume(ctx, `support-guest:${await digest(args.guestEmail)}`, 5, DAY)
  const id = await insertTicket(ctx, args)
  if (args.guestEmail) {
    await enqueue(ctx, id, 'acknowledgement')
    if (process.env.SUPPORT_INBOX_EMAIL) await enqueue(ctx, id, 'team')
  }
  return { id }
} })
export const list = query({ args: { admin: v.optional(v.boolean()), status: v.optional(status), cursor: v.optional(v.string()) }, handler: async (ctx, args) => {
  const a = await owner(ctx)
  let rows
  if (args.admin) {
    await requireAccount(ctx, 'admin')
    rows = ctx.db.query('supportTickets').withIndex('by_status', q => q.eq('status', args.status || 'open'))
  } else rows = ctx.db.query('supportTickets').withIndex('by_account', q => q.eq('accountId', a._id))
  const page = await rows.order(args.admin ? 'asc' : 'desc').paginate({ numItems: 25, cursor: args.cursor || null })
  return { tickets: page.page.map(summary), cursor: page.isDone ? null : page.continueCursor }
} })
export const thread = query({ args: { id: v.id('supportTickets'), key: v.optional(v.string()) }, handler: async (ctx, args) => {
  const { ticket, admin } = await access(ctx, args.id, args.key)
  const messages = await ctx.db.query('supportMessages').withIndex('by_ticket', q => q.eq('ticketId', ticket._id)).take(100)
  const emails = admin ? (await ctx.db.query('supportEmails').withIndex('by_ticket', q => q.eq('ticketId', ticket._id)).take(102)).map(e => ({ id: e._id, kind: e.kind, status: e.status })) : undefined
  return { ...summary(ticket), ...(admin ? { guest: !ticket.accountId, guestEmail: ticket.guestEmail || null, emails } : {}), messages: messages.map(m => ({ id: m._id, sender: m.sender, body: m.body, createdAt: m.createdAt })) }
} })
export const reply = mutation({ args: { id: v.id('supportTickets'), key: v.optional(v.string()), body: v.string() }, handler: async (ctx, args) => {
  const { ticket, admin, account } = await access(ctx, args.id, args.key)
  const body = text(args.body, 'your message', 2000, true)
  if (ticket.messageCount >= 100) fail('This conversation is full. Open a new ticket and mention this reference.')
  await consume(ctx, `support-reply:${account?._id || ticket._id}`, 20, 3600000)
  const messageId = await ctx.db.insert('supportMessages', { ticketId: ticket._id, sender: admin ? 'support' : 'customer', body, createdAt: Date.now() })
  if (admin && ticket.guestEmail) await enqueue(ctx, ticket._id, 'reply', messageId)
  await ctx.db.patch(ticket._id, { status: admin ? 'waiting' : 'open', messageCount: ticket.messageCount + 1, updatedAt: Date.now() })
  await audit(ctx, account?._id, 'support_reply', ticket._id)
} })
export const retryEmail = mutation({ args: { id: v.id('supportEmails') }, handler: async (ctx, { id }) => {
  const a = await requireAccount(ctx, 'admin'), job = await ctx.db.get(id)
  if (!job || job.status !== 'failed' || !await ctx.db.get(job.ticketId)) fail('This email is not available for retry')
  await consume(ctx, `support-email-retry:${a._id}`, 5, 3600000)
  await ctx.db.patch(id, { status: 'pending', attempts: 0 })
  await ctx.scheduler.runAfter(0, internal.supportEmail.send, { id })
  await audit(ctx, a._id, 'support_email_retry', job.ticketId)
} })
export const resolve = mutation({ args: { id: v.id('supportTickets'), key: v.optional(v.string()), resolved: v.boolean() }, handler: async (ctx, args) => {
  const { ticket, account } = await access(ctx, args.id, args.key)
  await consume(ctx, `support-status:${account?._id || ticket._id}`, 20, 3600000)
  await ctx.db.patch(ticket._id, { status: args.resolved ? 'resolved' : 'open', updatedAt: Date.now() })
  await audit(ctx, account?._id, 'support_status_changed', ticket._id)
} })
