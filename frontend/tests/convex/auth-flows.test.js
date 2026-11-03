import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'
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
  await clientFor(t, verified).mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })
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
  await clientFor(t, original).mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'employer', phone: '0712345678', name: 'Parent' })
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
  expect(await t.query(api.accounts.authSettings)).toMatchObject({ emailReady: false })
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
  const original = await clientFor(t, otp).mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'employer', phone: '0712345678', name: 'Parent' })
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
  const account = await clientFor(t, original).mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'caregiver', phone: '0712345678', name: '' })
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

it('explains the email-provider test-sender restriction without exposing provider response details', async () => {
  const t=convexTest(schema,modules)
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({message:'You can only send testing emails to your own email address private-operator@example.test'}),{status:403})))
  await expect(sign(t,'password',{flow:'signUp',email:'newperson@example.test',password:'Testing123!'})).rejects.toThrow('Enter that exact address')
})

it('resumes password signup after temporary email failure without creating a duplicate account', async () => {
  const t = convexTest(schema, modules), email = 'retry@example.test'
  fetch.mockResolvedValueOnce(new Response('{}', { status: 503 }))
  await expect(sign(t, 'password', { flow: 'signUp', email, password: 'Testing123!' })).rejects.toThrow('Unable to send')
  expect(await t.run(ctx => ctx.db.query('authSessions').collect())).toHaveLength(0)
  // Sign in with the original password to request verification again.
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  expect((await sign(t, 'password', { flow: 'signIn', email, password: 'Testing123!' })).tokens).toBeNull()
  const verified = await sign(t, 'password', { flow: 'email-verification', email, code: code() })
  const account = await clientFor(t, verified).mutation(api.accounts.register, { termsAccepted: true, termsVersion: LEGAL_VERSION, role: 'employer', name: 'Test Parent', phone: '0712345678' })
  const returning = await sign(t, 'password', { flow: 'signIn', email, password: 'Testing123!' })
  expect((await clientFor(t, returning).query(api.accounts.me)).id).toBe(account.id)
  expect(await t.run(ctx => ctx.db.query('accounts').collect())).toHaveLength(1)
})

it('turns a signup retry with a different password into safe recovery guidance without replacing credentials', async () => {
  const t = convexTest(schema, modules), email = 'signup-retry@example.test'
  fetch.mockResolvedValueOnce(new Response('{}', { status: 503 }))
  await expect(sign(t, 'password', { flow: 'signUp', email, password: 'OriginalPassword123!' })).rejects.toThrow('Unable to send')
  const before = await t.run(ctx => ctx.db.query('authAccounts').first())
  await expect(sign(t, 'password', { flow: 'signUp', email, password: 'DifferentPassword123!' })).rejects.toThrow('reset your password')
  expect((await t.run(ctx => ctx.db.query('authAccounts').first())).secret).toBe(before.secret)
  expect(await t.run(ctx => ctx.db.query('authSessions').collect())).toHaveLength(0)
  await t.run(async ctx => { for (const row of await ctx.db.query('authEmailLimits').collect()) await ctx.db.delete(row._id) })
  // Repeating signup with the original password resumes verification safely.
  expect((await sign(t, 'password', { flow: 'signUp', email, password: 'OriginalPassword123!' })).tokens).toBeNull()
  expect(sent).toHaveLength(1)
  const verified = await sign(t, 'password', { flow: 'email-verification', email, code: code() })
  expect(verified.tokens.token).toBeTruthy()
})

it('explains an unverified sender domain even when the provider uses a non-403 validation status', async () => {
  const t = convexTest(schema, modules)
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'The domain example.test is not verified.' }), { status: 422 }))
  await expect(sign(t, 'email-otp', { email: 'newperson@example.test' })).rejects.toThrow('sending domain is not verified')
  expect(await t.run(ctx => ctx.db.query('authSessions').collect())).toHaveLength(0)
})

it('supports canonical magic links and OTPs with a production SITE_URL while rejecting arbitrary redirect origins', async () => {
  vi.stubEnv('SITE_URL', 'https://mlezicare.com')
  vi.stubEnv('APP_ALLOWED_ORIGINS', '')
  const t = convexTest(schema, modules)
  expect((await t.query(api.accounts.authSettings, {})).allowedSignInOrigins).toEqual(['https://mlezicare.com'])
  await expect(sign(t, 'magic-link', { email: 'blocked@example.test', redirectTo: 'http://localhost:5173/signin' })).rejects.toThrow('Invalid sign-in destination')
  expect(sent).toHaveLength(0)
  await sign(t, 'magic-link', { email: 'canonical@example.test', redirectTo: '/signin' })
  const url = new URL(sent.at(-1).text.match(/https?:\/\/[^\s]+/)[0])
  expect(url.origin + url.pathname).toBe('https://mlezicare.com/signin')
  expect((await sign(t, undefined, { code: url.searchParams.get('code') })).tokens.token).toBeTruthy()
  await sign(t, 'email-otp', { email: 'code@example.test' })
  expect((await sign(t, 'email-otp', { email: 'code@example.test', code: code() })).tokens.token).toBeTruthy()
})

it('permits an exact development origin only when the operator explicitly configures it', async () => {
  vi.stubEnv('SITE_URL', 'https://mlezicare.com')
  vi.stubEnv('APP_ALLOWED_ORIGINS', 'http://localhost:5173')
  const t = convexTest(schema, modules)
  expect((await t.query(api.accounts.authSettings, {})).allowedSignInOrigins).toEqual(['https://mlezicare.com', 'http://localhost:5173'])
  await sign(t, 'magic-link', { email: 'local@example.test', redirectTo: 'http://localhost:5173/signin' })
  expect(new URL(sent.at(-1).text.match(/https?:\/\/[^\s]+/)[0]).origin).toBe('http://localhost:5173')
  await expect(sign(t, 'magic-link', { email: 'evil@example.test', redirectTo: 'https://mlezicare.com.evil.test/signin' })).rejects.toThrow('Invalid sign-in destination')
})

it.each(['password', 'email-otp', 'magic-link'].flatMap(method => ['caregiver', 'employer'].map(role => [method, role])))('keeps %s signup for a new %s authenticated through account completion', async (method, role) => {
  const t = convexTest(schema, modules), email = `${method}-${role}@example.test`
  let verified
  if (method === 'password') {
    await sign(t, method, { flow: 'signUp', email, password: 'Testing123!' })
    verified = await sign(t, method, { flow: 'email-verification', email, code: code() })
  } else if (method === 'email-otp') {
    await sign(t, method, { email })
    verified = await sign(t, method, { email, code: code() })
  } else {
    await sign(t, method, { email, redirectTo: '/signin' })
    const token = new URL(sent.at(-1).text.match(/https?:\/\/[^\s]+/)[0]).searchParams.get('code')
    verified = await sign(t, undefined, { code: token })
  }
  const signedIn = clientFor(t, verified)
  expect((await signedIn.query(api.accounts.current, {})).status).toBe('onboarding')
  await signedIn.mutation(api.accounts.register, { role, name: 'Test Member', phone: '0712345678', termsAccepted: true, termsVersion: LEGAL_VERSION })
  const current = await signedIn.query(api.accounts.current, {})
  expect(current.status).toBe(role === 'employer' ? 'ready' : 'profile_required')
  expect(current.account.role).toBe(role)
  expect((await signedIn.query(api.accounts.me, {})).emailVerified).toBe(true)
})
