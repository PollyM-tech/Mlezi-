import { internalAction, internalMutation } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { supportEmailConfig } from './lib/supportEmail.js'
import { consume } from './lib/security.js'

export async function enqueue(ctx, ticketId, kind, messageId) {
  const id = await ctx.db.insert('supportEmails', { ticketId, kind, ...(messageId ? { messageId } : {}), status: 'pending', attempts: 0, createdAt: Date.now() })
  await ctx.scheduler.runAfter(0, internal.supportEmail.send, { id })
}
export const begin = internalMutation({ args: { id: v.id('supportEmails') }, handler: async (ctx, { id }) => {
  const job = await ctx.db.get(id)
  if (!job || job.status !== 'pending') return null
  const ticket = await ctx.db.get(job.ticketId)
  if (!ticket?.guestEmail) { await ctx.db.delete(id); return null }
  const message = job.messageId ? await ctx.db.get(job.messageId) : null
  if (job.kind === 'reply' && (!message || message.ticketId !== ticket._id || message.sender !== 'support')) { await ctx.db.delete(id); return null }
  const attempt = job.attempts + 1
  await ctx.db.patch(id, { status: 'sending', attempts: attempt, lastAttemptAt: Date.now() })
  await ctx.scheduler.runAfter(120000, internal.supportEmail.recover, { id, attempt })
  return { job, ticket, message, attempt }
} })
export const reserve = internalMutation({ args: {}, handler: async ctx => { await consume(ctx, 'support-email-minute', 20, 60000); await consume(ctx, 'support-email-day', 200, 86400000) } })
export const finish = internalMutation({ args: { id: v.id('supportEmails'), attempt: v.number(), sent: v.boolean() }, handler: async (ctx, { id, attempt, sent }) => {
  const job = await ctx.db.get(id)
  if (!job || job.attempts !== attempt || job.status !== 'sending') return
  await ctx.db.patch(id, { status: sent ? 'sent' : attempt < 3 ? 'pending' : 'failed', ...(sent ? { sentAt: Date.now() } : {}) })
  if (!sent && attempt < 3) await ctx.scheduler.runAfter(attempt * 60000, internal.supportEmail.send, { id })
} })
export const recover = internalMutation({ args: { id: v.id('supportEmails'), attempt: v.number() }, handler: async (ctx, { id, attempt }) => {
  const job = await ctx.db.get(id)
  if (!job || job.status !== 'sending' || job.attempts !== attempt) return
  await ctx.db.patch(id, { status: attempt < 3 ? 'pending' : 'failed' })
  if (attempt < 3) await ctx.scheduler.runAfter(0, internal.supportEmail.send, { id })
} })
export const send = internalAction({ args: { id: v.id('supportEmails') }, handler: async (ctx, { id }) => {
  const data = await ctx.runMutation(internal.supportEmail.begin, { id })
  if (!data) return
  const { job, ticket, message, attempt } = data, config = supportEmailConfig()
  let sent = false
  const acknowledgement = `Thank you for contacting Mlezi Support.\n\nWe have received your issue. Our team will address it within 48 hours and follow up with you by email.\n\nTicket reference: ${ticket._id}\n\nPlease do not send passwords, verification codes, identity documents or payment PINs.\n\nMlezi Support`
  const subject = job.kind === 'acknowledgement' ? 'We have received your Mlezi support request' : job.kind === 'team' ? 'New Mlezi support ticket' : 'An update on your Mlezi support request'
  const body = job.kind === 'acknowledgement' ? acknowledgement : job.kind === 'reply' ? `${message.body}\n\nTicket reference: ${ticket._id}\nMlezi Support` : `A visitor submitted a support request.\n\nTicket reference: ${ticket._id}\nSubject: ${ticket.subject}\nProvided email (unverified): ${ticket.guestEmail}\n\nOpen the administrator Support queue to read the issue and reply. Address it within 48 hours. Do not use an email claim as proof of account ownership.`
  try {
    if (config.key && config.from && (job.kind !== 'team' || config.inbox)) {
      await ctx.runMutation(internal.supportEmail.reserve, {})
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `mlezi-support-${id}` },
        body: JSON.stringify({ from: config.from, to: [job.kind === 'team' ? config.inbox : ticket.guestEmail], subject, text: body, ...(config.inbox ? { reply_to: job.kind === 'team' ? ticket.guestEmail : config.inbox } : {}) }), signal: AbortSignal.timeout(15000),
      })
      sent = response.ok
    }
  } catch { /* Store a bounded failure state; never log email content or keys. */ }
  await ctx.runMutation(internal.supportEmail.finish, { id, attempt, sent })
} })
