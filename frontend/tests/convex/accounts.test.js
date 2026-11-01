import { describe, it, expect, vi, afterEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api, internal } from '../../convex/_generated/api.js'
import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'
import { normalizeEmail, validatePassword, safeRedirect } from '../../convex/lib/authPolicy.js'
import { requireAccount } from '../../convex/lib/permissions.js'

const modules = import.meta.glob('../../convex/**/*.js')
const make = () => convexTest(schema, modules)
async function identity(t, email = 'person@example.test', verified = true) {
  const data = await t.run(async ctx => {
    const userId = await ctx.db.insert('users', { email, ...(verified ? { emailVerificationTime: Date.now() } : {}) })
    const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 3600000 })
    return { userId, sessionId }
  })
  return { ...data, client: t.withIdentity({ subject: `${data.userId}|${data.sessionId}` }) }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('Convex account permissions', () => {
  it('requires current terms acceptance for new accounts and records it without inventing legacy consent', async () => {
    const t = make(), who = await identity(t)
    const details = { role: 'employer', phone: '0712345678', name: 'Parent' }
    await expect(who.client.mutation(api.accounts.register, details)).rejects.toThrow('Read and accept')
    await expect(who.client.mutation(api.accounts.register, { ...details, termsAccepted: true, termsVersion: 'old-version' })).rejects.toThrow('Read and accept')
    expect(await t.run(ctx => ctx.db.query('accounts').collect())).toHaveLength(0)
    const account = await who.client.mutation(api.accounts.register, { ...details, termsAccepted: true, termsVersion: LEGAL_VERSION })
    const stored = await t.run(ctx => ctx.db.get(account.id))
    expect(stored.termsVersion).toBe(LEGAL_VERSION); expect(stored.privacyNoticeVersion).toBe(LEGAL_VERSION)
    expect(stored.termsAcceptedAt).toBeTypeOf('number')
  })
  it('denies anonymous, unverified and revoked sessions', async () => {
    const t = make()
    await expect(t.query(api.accounts.me)).rejects.toThrow('sign in')
    const unverified = await identity(t, 'unverified@example.test', false)
    await expect(unverified.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })).rejects.toThrow('Verify your email')
    const valid = await identity(t)
    await valid.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })
    await t.run(ctx => ctx.db.delete(valid.sessionId))
    await expect(valid.client.query(api.accounts.me)).rejects.toThrow('session has expired')
  })
  it('creates only permitted roles, once, and rejects invalid details', async () => {
    const t = make(), who = await identity(t)
    await expect(who.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'admin', phone: '0712345678', name: '' })).rejects.toThrow()
    await expect(who.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: 'bad', name: '' })).rejects.toThrow('phone')
    const account = await who.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })
    expect(account.role).toBe('caregiver')
    const retry = await who.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'employer', phone: '0712345678', name: 'Changed role' })
    expect(retry.id).toBe(account.id); expect(retry.role).toBe('caregiver')
    expect(await t.run(ctx => ctx.db.query('accounts').collect())).toHaveLength(1)
    await expect(who.client.run(ctx => requireAccount(ctx, 'admin'))).rejects.toThrow('permission')
  })
  it('creates a private employer profile and isolates accounts', async () => {
    const t = make(), employer = await identity(t, 'parent@example.test'), caregiver = await identity(t)
    await employer.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'employer', phone: '0712345678', name: 'Parent' })
    await caregiver.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0798765432', name: '' })
    const own = await caregiver.client.query(api.accounts.me)
    expect(own.email).toBe('person@example.test')
    expect(own).not.toHaveProperty('authSubject')
    expect(await t.run(ctx => ctx.db.query('employers').collect())).toHaveLength(1)
    await expect(caregiver.client.query(api.accounts.me, { id: employer.userId })).rejects.toThrow()
  })
  it('preserves reserved legacy roles only after verified email proof', async () => {
    const t = make()
    await t.mutation(internal.accounts.importLegacy, { records: [{ legacyId: 42, email: 'ADMIN@example.test', role: 'admin', createdAt: 1 }] })
    const noProof = await identity(t, 'admin@example.test', false)
    await expect(noProof.client.mutation(api.accounts.ensureExisting)).rejects.toThrow('Verify your email')
    const admin = await identity(t, 'admin@example.test')
    const account = await admin.client.mutation(api.accounts.ensureExisting)
    expect(account.role).toBe('admin'); expect(account.legacyId).toBe(42)
    const attemptedChange = await admin.client.mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })
    expect(attemptedChange.role).toBe('admin')
    const impersonator = await identity(t, 'another@example.test')
    expect(await impersonator.client.mutation(api.accounts.ensureExisting)).toBeNull()
    const duplicate = await identity(t, 'admin@example.test')
    await expect(duplicate.client.mutation(api.accounts.ensureExisting)).rejects.toThrow('already linked')
  })
  it('throttles email requests across providers', async () => {
    const t = make()
    vi.spyOn(Date, 'now').mockReturnValue(1000000)
    await t.mutation(internal.emailLimits.consume, { email: 'person@example.test' })
    await expect(t.mutation(internal.emailLimits.consume, { email: 'person@example.test' })).rejects.toThrow('wait')
    for (let index = 1; index < 5; index++) {
      Date.now.mockReturnValue(1000000 + index * 61000)
      await t.mutation(internal.emailLimits.consume, { email: 'person@example.test' })
    }
    Date.now.mockReturnValue(1400000)
    await expect(t.mutation(internal.emailLimits.consume, { email: 'person@example.test' })).rejects.toThrow('five per hour')
    Date.now.mockReturnValue(5000000)
    await t.mutation(internal.emailLimits.consume, { email: 'person@example.test' })
  })
  it('validates emails, passwords and callback origins', () => {
    expect(normalizeEmail(' Person@Example.test ')).toBe('person@example.test')
    expect(() => normalizeEmail('bad')).toThrow()
    expect(() => validatePassword('short')).toThrow()
    expect(() => validatePassword('x'.repeat(129))).toThrow()
    expect(() => safeRedirect('https://evil.test', 'http://localhost:5173')).toThrow()
    expect(() => safeRedirect('//evil.test', 'http://localhost:5173')).toThrow()
    expect(safeRedirect('/#/signin', 'http://localhost:5173')).toBe('http://localhost:5173/#/signin')
  })
})
