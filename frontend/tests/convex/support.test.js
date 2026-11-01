import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
import { keyHash } from '../../convex/support.js'
const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
const DAY = 86400000
async function person(t, role = 'caregiver', suffix = role, mfa = true) {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: `${suffix}@example.test`, emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + DAY })
    const accountId = await ctx.db.insert('accounts', { authSubject: userId, email: `${suffix}@example.test`, role, createdAt: Date.now() })
    if (role === 'admin' && mfa) await ctx.db.insert('adminSessions', { accountId, sessionId, expiresAt: Date.now() + 3600000 })
    return { userId, sessionId, accountId }
  })
  return { ...ids, client: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }) }
}
const issue = { subject: 'Cannot upload profile', category: 'technical', body: 'The image upload fails.' }
beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('isolates ticket lists, reads, replies and status changes between accounts', async () => {
  const t = make(), a = await person(t), other = await person(t, 'employer'), admin = await person(t, 'admin')
  const { id } = await a.client.mutation(api.support.create, issue)
  expect((await other.client.query(api.support.list, {})).tickets).toHaveLength(0)
  await expect(other.client.query(api.support.thread, { id })).rejects.toThrow('not found')
  await expect(other.client.mutation(api.support.reply, { id, body: 'Hijack' })).rejects.toThrow('not found')
  await expect(other.client.mutation(api.support.resolve, { id, resolved: true })).rejects.toThrow('not found')
  await expect(other.client.query(api.support.list, { admin: true })).rejects.toThrow('permission')
  await expect(t.query(api.support.thread, { id })).rejects.toThrow('sign in')
  await admin.client.mutation(api.support.reply, { id, body: 'Please retry with a supported image.' })
  let ticket = await a.client.query(api.support.thread, { id })
  expect(ticket.status).toBe('waiting'); expect(ticket.messages[1].sender).toBe('support')
  expect(ticket).not.toHaveProperty('accountId'); expect(ticket).not.toHaveProperty('guestEmail')
  await a.client.mutation(api.support.resolve, { id, resolved: true })
  await a.client.mutation(api.support.reply, { id, body: 'It is still failing.' })
  ticket = await a.client.query(api.support.thread, { id })
  expect(ticket.status).toBe('open')
  expect((await admin.client.query(api.support.list, { admin: true, status: 'open' })).tickets[0].id).toBe(id)
})
it('keeps support available without a caregiver photo and during restrictions, but requires admin MFA', async () => {
  const t = make(), a = await person(t), admin = await person(t, 'admin', 'unverifiedAdmin', false)
  await t.run(ctx => ctx.db.patch(a.accountId, { suspendedAt: Date.now() }))
  const { id } = await a.client.mutation(api.support.create, issue)
  expect((await a.client.query(api.support.thread, { id })).subject).toBe(issue.subject)
  await expect(admin.client.query(api.support.thread, { id })).rejects.toThrow('authenticator')
  await expect(admin.client.query(api.support.list, { admin: true })).rejects.toThrow('authenticator')
})
it('bounds content, creation and replies before growing the support queue', async () => {
  const t = make(), a = await person(t)
  await expect(a.client.mutation(api.support.create, { ...issue, subject: ' ' })).rejects.toThrow('subject')
  await expect(a.client.mutation(api.support.create, { ...issue, body: 'x'.repeat(2001) })).rejects.toThrow('message')
  await expect(a.client.mutation(api.support.create, { ...issue, category: 'admin' })).rejects.toThrow('category')
  const ids = []
  for (let i = 0; i < 5; i++) ids.push((await a.client.mutation(api.support.create, issue)).id)
  await expect(a.client.mutation(api.support.create, issue)).rejects.toThrow('Too many')
  await t.run(ctx => ctx.db.patch(ids[0], { messageCount: 100 }))
  await expect(a.client.mutation(api.support.reply, { id: ids[0], body: 'More' })).rejects.toThrow('full')
})
it('requires both a guest reference and strong access key and never exposes the stored hash', async () => {
  const t = make(), key = 'a'.repeat(64)
  const { id } = await t.mutation(internal.support.createGuest, { ...issue, guestKeyHash: await keyHash(key), guestEmail: 'owner@example.test' })
  await expect(t.query(api.support.thread, { id })).rejects.toThrow('sign in')
  await expect(t.query(api.support.thread, { id, key: 'b'.repeat(64) })).rejects.toThrow('incorrect')
  await expect(t.mutation(api.support.reply, { id, key: 'b'.repeat(64), body: 'Hijack' })).rejects.toThrow('incorrect')
  const thread = await t.query(api.support.thread, { id, key })
  expect(thread.subject).toBe(issue.subject); expect(thread).not.toHaveProperty('guestKeyHash'); expect(thread).not.toHaveProperty('guestEmail')
  await t.mutation(api.support.reply, { id, key, body: 'An additional detail.' })
  expect((await t.query(api.support.thread, { id, key })).messages).toHaveLength(2)
  const a = await person(t, 'employer', 'owner')
  await expect(a.client.query(api.support.thread, { id })).rejects.toThrow('not found')
})
it('fails closed without Turnstile and rejects failed, wrong-host and wrong-action challenges', async () => {
  const t = make(), args = { ...issue, email: 'guest@example.test', challenge: 'test-token' }
  await expect(t.action(api.supportGuest.create, args)).rejects.toThrow('spam-protection setup')
  vi.stubEnv('AUTH_RESEND_KEY', 'fixture-resend-key'); vi.stubEnv('AUTH_EMAIL_FROM', 'Mlezi <support@example.test>'); vi.stubEnv('TURNSTILE_SECRET_KEY', 'fixture-secret'); vi.stubEnv('SUPPORT_ALLOWED_HOSTNAMES', 'support.example.test')
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  for (const result of [{ success: false }, { success: true, action: 'support', hostname: 'evil.example' }, { success: true, action: 'other', hostname: 'support.example.test' }]) {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => result })
    await expect(t.action(api.supportGuest.create, args)).rejects.toThrow('failed or expired')
  }
  expect(await t.run(ctx => ctx.db.query('supportTickets').collect())).toHaveLength(0)
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, action: 'support', hostname: 'support.example.test' }) })
  const access = await t.action(api.supportGuest.create, args)
  expect(access.key).toMatch(/^[a-f0-9]{64}$/)
  expect((await t.query(api.support.thread, access)).subject).toBe(issue.subject)
  expect((await t.run(ctx => ctx.db.get(access.id))).guestKeyHash).not.toBe(access.key)
})
it('purges account-linked conversations and expires closed and inactive guest tickets', async () => {
  const t = make(), a = await person(t)
  const { id } = await a.client.mutation(api.support.create, issue)
  const exported = await a.client.mutation(api.privacy.exportOwn)
  expect(exported.supportTickets[0].messages[0].body).toBe(issue.body)
  await t.run(ctx => ctx.db.patch(a.accountId, { deletionRequestedAt: Date.now() - 8 * DAY }))
  await t.mutation(internal.privacy.purge, { accountId: a.accountId })
  expect(await t.run(ctx => ctx.db.get(id))).toBeNull()
  const key = 'c'.repeat(64)
  const { id: guestId } = await t.mutation(internal.support.createGuest, { ...issue, guestKeyHash: await keyHash(key), guestEmail: 'guest@example.test' })
  await t.run(ctx => ctx.db.patch(guestId, { status: 'resolved', updatedAt: Date.now() - 91 * DAY }))
  await t.mutation(internal.retention.sweep, {})
  expect(await t.run(ctx => ctx.db.get(guestId))).toBeNull()
  expect(await t.run(ctx => ctx.db.query('supportMessages').collect())).toHaveLength(0)
  expect(await t.run(ctx => ctx.db.query('supportEmails').collect())).toHaveLength(0)
})
