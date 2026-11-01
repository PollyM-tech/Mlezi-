import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('AUTH_RESEND_KEY', 'fixture-only'); vi.stubEnv('AUTH_EMAIL_FROM', 'Mlezi Support <support@example.test>')
  vi.stubEnv('SUPPORT_INBOX_EMAIL', 'team@example.test')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
async function guest(t) {
  return t.mutation(internal.support.createGuest, { subject: 'User controlled subject', category: 'technical', body: 'Untrusted user message https://example.invalid', guestEmail: 'guest@example.test', guestKeyHash: 'a'.repeat(64) })
}
const emails = t => t.run(ctx => ctx.db.query('supportEmails').collect())
it('queues the acknowledgement and team notification, using a canned 48-hour response and a private reply inbox', async () => {
  const t = make(), { id } = await guest(t), jobs = await emails(t)
  expect(jobs.map(j => j.kind)).toEqual(['acknowledgement', 'team'])
  await t.action(internal.supportEmail.send, { id: jobs[0]._id })
  const [url, request] = fetch.mock.calls[0], message = JSON.parse(request.body)
  expect(url).toBe('https://api.resend.com/emails')
  expect(message.to).toEqual(['guest@example.test']); expect(message.reply_to).toBe('team@example.test')
  expect(message.text).toContain('48 hours'); expect(message.text).toContain(id)
  expect(message.text).not.toContain('Untrusted user message'); expect(message.text).not.toContain('https://example.invalid')
  expect((await emails(t))[0].status).toBe('sent')
  await t.action(internal.supportEmail.send, { id: jobs[0]._id })
  expect(fetch).toHaveBeenCalledTimes(1)
  await t.action(internal.supportEmail.send, { id: jobs[1]._id })
  expect(JSON.parse(fetch.mock.calls[1][1].body).to).toEqual(['team@example.test'])
})
it('retries provider failures with the same idempotency key and stops after three attempts', async () => {
  const t = make(); await guest(t); const [job] = await emails(t)
  fetch.mockResolvedValue({ ok: false })
  for (let i = 0; i < 3; i++) await t.action(internal.supportEmail.send, { id: job._id })
  const stored = (await emails(t))[0]
  expect(stored.status).toBe('failed'); expect(stored.attempts).toBe(3)
  expect(new Set(fetch.mock.calls.map(([, r]) => r.headers['Idempotency-Key'])).size).toBe(1)
  await t.action(internal.supportEmail.send, { id: job._id })
  expect(fetch).toHaveBeenCalledTimes(3)
  await expect(t.mutation(api.support.retryEmail, { id: job._id })).rejects.toThrow('sign in')
})
it('emails administrator replies, without allowing a guest to choose another recipient', async () => {
  const t = make(), { id } = await guest(t)
  const admin = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: 'admin@example.test', emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 86400000 })
    const accountId = await ctx.db.insert('accounts', { role: 'admin', email: 'admin@example.test', authSubject: userId, createdAt: Date.now() })
    await ctx.db.insert('adminSessions', { accountId, sessionId, expiresAt: Date.now() + 3600000 })
    return { userId, sessionId }
  })
  const client = t.withIdentity({ subject: `${admin.userId}|${admin.sessionId}` })
  await client.mutation(api.support.reply, { id, body: 'Your issue is resolved.' })
  const job = (await emails(t)).find(j => j.kind === 'reply')
  await t.action(internal.supportEmail.send, { id: job._id })
  const message = JSON.parse(fetch.mock.calls[0][1].body)
  expect(message.to).toEqual(['guest@example.test']); expect(message.text).toContain('Your issue is resolved.')
  expect(message.from).not.toContain('admin@example.test')
})
it('never sends queued support mail after its ticket has been deleted', async () => {
  const t = make(), { id } = await guest(t), [job] = await emails(t)
  await t.run(ctx => ctx.db.delete(id))
  await t.action(internal.supportEmail.send, { id: job._id })
  expect(fetch).not.toHaveBeenCalled()
})
it('rejects a missing guest email before any CAPTCHA or email request', async () => {
  const t = make()
  await expect(t.action(api.supportGuest.create, { subject: 'Help', category: 'technical', body: 'Problem', email: '', challenge: 'fixture' })).rejects.toThrow('valid email')
  expect(fetch).not.toHaveBeenCalled()
})
