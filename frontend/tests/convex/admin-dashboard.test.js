import { afterEach, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
async function person(t, role = 'admin', mfa = true) {
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: `${role}@example.test`, emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 86400000 })
    const accountId = await ctx.db.insert('accounts', { email: `${role}@example.test`, role, authSubject: userId, createdAt: Date.now() })
    if (role === 'admin' && mfa) await ctx.db.insert('adminSessions', { accountId, sessionId, expiresAt: Date.now() + 600000 })
    return { userId, sessionId, accountId }
  })
  return { ...ids, client: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }) }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
it('requires a verified administrator and current MFA for every operations read', async () => {
  const t = make(), parent = await person(t, 'employer'), admin = await person(t, 'admin', false)
  for (const ref of [api.adminDashboard.overview, api.adminDashboard.failedEmails]) {
    await expect(t.query(ref, {})).rejects.toThrow('sign in')
    await expect(parent.client.query(ref, {})).rejects.toThrow('permission')
    await expect(admin.client.query(ref, {})).rejects.toThrow('authenticator')
  }
})
it('shows actionable queues, prioritizes overdue tickets and clears them when resolved', async () => {
  vi.useFakeTimers()
  const t = make(), admin = await person(t), parent = await person(t, 'employer')
  const { id } = await parent.client.mutation(api.support.create, { subject: 'Cannot sign in', category: 'account', body: 'Please help.' })
  await t.run(async ctx => {
    await ctx.db.patch(id, { createdAt: Date.now() - 49 * 3600000 })
    await ctx.db.insert('supportEmails', { ticketId: id, kind: 'acknowledgement', status: 'failed', attempts: 3, createdAt: Date.now() })
    await ctx.db.insert('dataRequests', { accountId: parent.accountId, type: 'correction', status: 'open', createdAt: Date.now() })
    await ctx.db.insert('payments', { accountId: parent.accountId, provider: 'manual_mpesa', type: 'unlock_pass', amount: 300, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() })
    await ctx.db.insert('reports', { reporterId: parent.accountId, reportedAccountId: parent.accountId, reason: 'safety', status: 'open', createdAt: Date.now() })
  })
  const overview = await admin.client.query(api.adminDashboard.overview, {})
  expect(overview.queues.tickets.count).toBe(1)
  expect(overview.queues.operations.count).toBe(1)
  expect(overview.queues.payments.count).toBe(1)
  expect(overview.queues.reports.count).toBe(1)
  expect(overview.queues.failedEmails.count).toBe(1)
  expect(overview.overdueTickets).toBe(1)
  expect(overview.notifications[0]).toMatchObject({ id, urgent: true, section: 'tickets' })
  expect(JSON.stringify(overview)).not.toContain('guestKeyHash')
  const failures = await admin.client.query(api.adminDashboard.failedEmails, {})
  expect(failures.emails[0]).toMatchObject({ ticketId: id, subject: 'Cannot sign in' })
  await admin.client.mutation(api.support.resolve, { id, resolved: true })
  expect((await admin.client.query(api.adminDashboard.overview, {})).queues.tickets.count).toBe(0)
})
it('caps queue counts instead of scanning unbounded ticket histories', async () => {
  const t = make(), admin = await person(t)
  await t.run(async ctx => { for (let i = 0; i < 105; i++) await ctx.db.insert('supportTickets', { subject: `Ticket ${i}`, category: 'technical', status: 'open', messageCount: 1, createdAt: Date.now(), updatedAt: Date.now() }) })
  const overview = await admin.client.query(api.adminDashboard.overview, {})
  expect(overview.queues.tickets).toEqual({ count: 100, more: true })
  expect(overview.notifications).toHaveLength(20)
})
it('operator provisioning reserves the supplied admin email and public registration cannot change that role', async () => {
  const t = make()
  const first = await t.mutation(internal.adminDashboard.provision, { email: 'OWNER@EXAMPLE.TEST' })
  expect(first).toEqual({ provisioned: true, changed: true })
  expect(await t.mutation(internal.adminDashboard.provision, { email: 'owner@example.test' })).toEqual({ provisioned: true, changed: false })
  const account = await t.run(ctx => ctx.db.query('accounts').first())
  expect(account).toMatchObject({ role: 'admin', email: 'owner@example.test' })
  expect(account.authSubject).toBeUndefined()
  expect(await t.run(ctx => ctx.db.query('authAccounts').collect())).toHaveLength(0)
  expect(await t.run(ctx => ctx.db.query('adminSessions').collect())).toHaveLength(0)
  const user = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email: 'owner@example.test', emailVerificationTime: Date.now() })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 86400000 })
    return { userId, sessionId }
  })
  const owner = t.withIdentity({ subject: `${user.userId}|${user.sessionId}` })
  expect((await owner.mutation(api.accounts.ensureExisting, {})).role).toBe('admin')
  expect((await owner.mutation(api.accounts.register, { role: 'employer', name: 'Owner', phone: '0712345678' })).role).toBe('admin')
  expect((await owner.query(api.accounts.current, {})).status).toBe('admin_security')
  await expect(owner.query(api.adminDashboard.overview, {})).rejects.toThrow('authenticator')
})
