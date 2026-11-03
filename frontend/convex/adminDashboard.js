import { query, internalMutation } from './_generated/server.js'
import { v, ConvexError } from 'convex/values'
import { requireAccount } from './lib/permissions.js'
import { normalizeEmail } from './lib/authPolicy.js'
import { audit } from './lib/security.js'

// Bounded, indexed reads keep the live operations panel predictable as data grows.
const LIMIT = 100
export const overview = query({ args: { clock: v.optional(v.number()) }, handler: async ctx => {
  await requireAccount(ctx, 'admin')
  const [identities, tickets, waiting, reports, reviewed, privacy, payments, failedEmails] = await Promise.all([
    ctx.db.query('verificationSubmissions').withIndex('by_status', q => q.eq('status', 'pending')).take(LIMIT + 1),
    ctx.db.query('supportTickets').withIndex('by_status', q => q.eq('status', 'open')).take(LIMIT + 1),
    ctx.db.query('supportTickets').withIndex('by_status', q => q.eq('status', 'waiting')).take(LIMIT + 1),
    ctx.db.query('reports').withIndex('by_status', q => q.eq('status', 'open')).take(LIMIT + 1),
    ctx.db.query('reports').withIndex('by_status', q => q.eq('status', 'reviewed')).take(LIMIT + 1),
    ctx.db.query('dataRequests').withIndex('by_status', q => q.eq('status', 'open')).take(LIMIT + 1),
    ctx.db.query('payments').withIndex('by_manual_status', q => q.eq('provider', 'manual_mpesa').eq('status', 'pending')).take(LIMIT + 1),
    ctx.db.query('supportEmails').withIndex('by_status', q => q.eq('status', 'failed')).take(LIMIT + 1),
  ])
  const count = rows => ({ count: Math.min(rows.length, LIMIT), more: rows.length > LIMIT })
  const now = Date.now(), due = t => t.createdAt + 48 * 3600000
  const notifications = [
    ...tickets.slice(0, LIMIT).map(t => ({ id: t._id, section: 'tickets', title: t.subject, createdAt: t.createdAt, dueAt: due(t), urgent: t.category === 'safety' || due(t) <= now, label: due(t) <= now ? 'Support overdue' : due(t) <= now + 6 * 3600000 ? 'Support due soon' : 'New support request' })),
    ...identities.slice(0, LIMIT).map(r => ({ id: r._id, section: 'identity', title: 'Identity evidence awaiting comparison', createdAt: r.submittedAt, label: 'Identity check' })),
    ...[...reports, ...reviewed].slice(0, LIMIT).map(r => ({ id: r._id, section: 'reports', title: r.reason, createdAt: r.createdAt, urgent: true, label: 'Safety report' })),
    ...privacy.slice(0, LIMIT).map(r => ({ id: r._id, section: 'operations', title: r.type === 'deletion' ? 'Account deletion request' : 'Data correction request', createdAt: r.createdAt, label: 'Privacy request' })),
    ...payments.slice(0, LIMIT).map(r => ({ id: r._id, section: 'payments', title: 'Compare receipt against the business statement', createdAt: r.createdAt, label: 'Manual payment' })),
    ...failedEmails.slice(0, LIMIT).map(r => ({ id: r.ticketId, section: 'tickets', title: 'Support email needs attention', createdAt: r.createdAt, urgent: true, label: 'Failed email' })),
  ].sort((a,b) => Number(!!b.urgent) - Number(!!a.urgent) || a.createdAt - b.createdAt).slice(0, 20)
  return { queues: { identity: count(identities), tickets: count(tickets), waiting: count(waiting), reports: count([...reports, ...reviewed]), operations: count(privacy), payments: count(payments), failedEmails: count(failedEmails) }, overdueTickets: tickets.filter(t => due(t) <= now).length, dueSoonTickets: tickets.filter(t => due(t) > now && due(t) <= now + 6 * 3600000).length, notifications }
} })

// Deployment-operator command only. Email possession is still verified by Convex Auth;
// no public registration input or hidden URL can assign an administrator role.
export const provision = internalMutation({ args: { email: v.string() }, handler: async (ctx, { email: input }) => {
  const email = normalizeEmail(input)
  const existing = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique()
  if (existing?.suspendedAt || existing?.deletionRequestedAt) throw new ConvexError('Resolve account restrictions before provisioning an administrator.')
  if (existing?.role === 'admin') return { provisioned: true, changed: false }
  const id = existing?._id || await ctx.db.insert('accounts', { email, role: 'admin', createdAt: Date.now() })
  if (existing) await ctx.db.patch(id, { role: 'admin' })
  await audit(ctx, undefined, 'admin_provisioned_by_operator', id)
  return { provisioned: true, changed: true }
} })

export const failedEmails = query({ args: {}, handler: async ctx => {
  await requireAccount(ctx, 'admin')
  const jobs = await ctx.db.query('supportEmails').withIndex('by_status', q => q.eq('status', 'failed')).take(51)
  return { more: jobs.length > 50, emails: (await Promise.all(jobs.slice(0,50).map(async job => {
    const ticket = await ctx.db.get(job.ticketId)
    return ticket ? { id: job._id, ticketId: ticket._id, subject: ticket.subject, kind: job.kind, attempts: job.attempts, createdAt: job.createdAt } : null
  }))).filter(Boolean) }
} })
