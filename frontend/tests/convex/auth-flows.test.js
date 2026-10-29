import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Buffer } from 'node:buffer'
import { generateKeyPairSync } from 'node:crypto'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { api } from '../../convex/_generated/api.js'

const modules = import.meta.glob('../../convex/**/*.js')
let sent
beforeEach(() => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  vi.stubEnv('JWT_PRIVATE_KEY', privateKey.export({ type: 'pkcs8', format: 'pem' }).trimEnd().replace(/\n/g, ' '))
  vi.stubEnv('JWKS', JSON.stringify({ keys: [{ use: 'sig', ...publicKey.export({ format: 'jwk' }) }] }))
  vi.stubEnv('CONVEX_SITE_URL', 'https://example.convex.site')
  vi.stubEnv('SITE_URL', 'http://localhost:5173')
  vi.stubEnv('AUTH_RESEND_KEY', 'test-no-delivery')
  vi.stubEnv('AUTH_EMAIL_FROM', 'Mlezi <auth@example.test>')
  sent = []
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(url).toBe('https://api.resend.com/emails')
    sent.push(JSON.parse(options.body))
    return new Response(JSON.stringify({ id: 'test-message' }), { status: 200 })
  }))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const sign = (t, provider, params) => t.action(api.auth.signIn, { ...(provider ? { provider } : {}), params })
const code = () => sent.at(-1).text.match(/code: (\d{8})/)[1]
const clientFor = (t, result) => t.withIdentity({ subject: JSON.parse(Buffer.from(result.tokens.token.split('.')[1], 'base64url')).sub })

it('verifies password signup; email OTP links to the same verified user; rejects reused codes', async () => {
  const t = convexTest(schema, modules)
  const initial = await sign(t, 'password', { flow: 'signUp', email: 'Person@Example.test', password: 'Testing123!' })
  expect(initial.tokens).toBeNull()
  expect(sent[0].to).toEqual(['person@example.test'])
  const signupCode = code()
  await expect(sign(t, 'password', { flow: 'email-verification', email: 'person@example.test', code: '00000000' })).rejects.toThrow()
  const verified = await sign(t, 'password', { flow: 'email-verification', email: 'person@example.test', code: signupCode })
  expect(verified.tokens.token).toBeTruthy()
  await clientFor(t, verified).mutation(api.accounts.register, { role: 'caregiver', phone: '0712345678', name: '' })
  const original = await clientFor(t, verified).query(api.accounts.me)
  await expect(sign(t, 'password', { flow: 'email-verification', email: 'person@example.test', code: signupCode })).rejects.toThrow()
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  await sign(t, 'email-otp', { email: 'person@example.test' })
  const otp = await sign(t, 'email-otp', { email: 'person@example.test', code: code() })
  expect((await clientFor(t, otp).query(api.accounts.me)).id).toBe(original.id)
})

it('password recovery changes credentials and revokes older sessions', async () => {
  const t = convexTest(schema, modules), email = 'recovery@example.test'
  await sign(t, 'password', { flow: 'signUp', email, password: 'OldPassword123!' })
  const original = await sign(t, 'password', { flow: 'email-verification', email, code: code() })
  await clientFor(t, original).mutation(api.accounts.register, { role: 'employer', phone: '0712345678', name: 'Parent' })
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  await sign(t, 'password', { flow: 'reset', email })
  const recovered = await sign(t, 'password', { flow: 'reset-verification', email, code: code(), newPassword: 'NewPassword123!' })
  await expect(clientFor(t, original).query(api.accounts.me)).rejects.toThrow('session has expired')
  expect((await clientFor(t, recovered).query(api.accounts.me)).role).toBe('employer')
  await expect(sign(t, 'password', { flow: 'signIn', email, password: 'OldPassword123!' })).rejects.toThrow()
  expect((await sign(t, 'password', { flow: 'signIn', email, password: 'NewPassword123!' })).tokens.token).toBeTruthy()
})

it('magic links are high-entropy, single-use and expire', async () => {
  const t = convexTest(schema, modules), email = 'magic@example.test'
  await sign(t, 'magic-link', { email, redirectTo: '/#/signin' })
  const url = new URL(sent[0].text.match(/https?:\/\/[^\s]+/)[0])
  expect(url.origin).toBe('http://localhost:5173')
  const token = url.searchParams.get('code')
  expect(token.length).toBeGreaterThanOrEqual(32)
  expect((await sign(t, undefined, { code: token })).tokens.token).toBeTruthy()
  expect((await sign(t, undefined, { code: token })).tokens).toBeNull()
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  await sign(t, 'magic-link', { email: 'expire@example.test' })
  const expired = new URL(sent.at(-1).text.match(/https?:\/\/[^\s]+/)[0]).searchParams.get('code')
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000)
  expect((await sign(t, undefined, { code: expired })).tokens).toBeNull()
})

it('blocks email auth when sender configuration is missing', async () => {
  const t = convexTest(schema, modules)
  vi.stubEnv('AUTH_RESEND_KEY', '')
  expect(await t.query(api.accounts.authSettings)).toEqual({ emailReady: false })
  await expect(sign(t, 'email-otp', { email: 'unconfigured@example.test' })).rejects.toThrow('not configured')
  expect(sent).toHaveLength(0)
})


it('links a pending password signup after OTP login only when email ownership is proved', async () => {
  const t = convexTest(schema, modules), email = 'pending@example.test'
  await sign(t, 'password', { flow: 'signUp', email, password: 'Testing123!' })
  const passwordCode = code()
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  await sign(t, 'email-otp', { email })
  const otp = await sign(t, 'email-otp', { email, code: code() })
  const original = await clientFor(t, otp).mutation(api.accounts.register, { role: 'employer', phone: '0712345678', name: 'Parent' })
  // An unverified password credential must not grant a session on the verified account.
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  expect((await sign(t, 'password', { flow: 'signIn', email, password: 'Testing123!' })).tokens).toBeNull()
  const password = await sign(t, 'password', { flow: 'email-verification', email, code: code() })
  expect((await clientFor(t, password).query(api.accounts.me)).id).toBe(original.id)
  expect(passwordCode).toHaveLength(8)
})

it('forgot password sends a reset for an imported account with no Convex password, without granting access before verification', async () => {
  const t = convexTest(schema, modules), email = 'legacy-admin@example.test'
  const { internal } = await import('../../convex/_generated/api.js')
  await t.mutation(internal.accounts.importLegacy, { records: [{ legacyId: 7, email, role: 'admin', createdAt: 1 }] })
  expect((await t.run(ctx => ctx.db.query('authAccounts').collect()))).toHaveLength(0)
  expect((await sign(t, 'password-recovery', { flow: 'reset', email })).tokens).toBeNull()
  expect(sent).toHaveLength(1)
  expect(sent[0].subject).toBe('Reset your Mlezi password')
  expect(await t.run(ctx => ctx.db.query('authSessions').collect())).toHaveLength(0)
  const resetCode = code()
  await expect(sign(t, 'password', { flow: 'reset-verification', email, code: 'invalid-code', newPassword: 'NewPassword123!' })).rejects.toThrow()
  expect(await t.run(ctx => ctx.db.query('authSessions').collect())).toHaveLength(0)
  const result = await sign(t, 'password', { flow: 'reset-verification', email, code: resetCode, newPassword: 'NewPassword123!' })
  expect(result.tokens.token).toBeTruthy()
  const account = await clientFor(t, result).mutation(api.accounts.ensureExisting)
  expect(account.role).toBe('admin'); expect(account.legacyId).toBe(7)
  expect((await sign(t, 'password', { flow: 'signIn', email, password: 'NewPassword123!' })).tokens.token).toBeTruthy()
  expect(await t.run(ctx => ctx.db.query('accounts').collect())).toHaveLength(1)
  await expect(sign(t, 'password', { flow: 'reset-verification', email, code: resetCode, newPassword: 'AnotherPassword123!' })).rejects.toThrow()
})

it('recovery preserves passwordless account ownership and revokes its old sessions', async () => {
  const t = convexTest(schema, modules), email = 'passwordless@example.test'
  await sign(t, 'email-otp', { email })
  const original = await sign(t, 'email-otp', { email, code: code() })
  const account = await clientFor(t, original).mutation(api.accounts.register, { role: 'caregiver', phone: '0712345678', name: '' })
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  await sign(t, 'password-recovery', { flow: 'reset', email })
  const reset = await sign(t, 'password', { flow: 'reset-verification', email, code: code(), newPassword: 'NewPassword123!' })
  expect((await clientFor(t, reset).query(api.accounts.me)).id).toBe(account.id)
  await expect(clientFor(t, original).query(api.accounts.me)).rejects.toThrow('session has expired')
})

it('recovery does not create credentials or send email for an unknown address', async () => {
  const t = convexTest(schema, modules)
  expect((await sign(t, 'password-recovery', { flow: 'reset', email: 'unknown@example.test' })).tokens).toBeNull()
  expect(sent).toHaveLength(0)
  expect(await t.run(ctx => ctx.db.query('authAccounts').collect())).toHaveLength(0)
  await expect(sign(t, 'password-recovery', { flow: 'signIn', email: 'unknown@example.test' })).rejects.toThrow('Invalid password recovery')
})
