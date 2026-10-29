import { query, mutation, internalMutation } from './_generated/server.js'
import { getAuthSessionId } from '@convex-dev/auth/server'
import { v, ConvexError } from 'convex/values'
import { accountIdentity } from './lib/permissions.js'
import { bytes64, from64, audit, consume } from './lib/security.js'
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function base32(bytes) { let bits = 0, value = 0, result = ''; for (const b of bytes) { value = value * 256 + b; bits += 8; while (bits >= 5) { bits -= 5; result += alphabet[(value >>> bits) & 31] }; value &= (1 << bits) - 1 }; if (bits) result += alphabet[(value << (5 - bits)) & 31]; return result }
async function key() {
  if (!process.env.AUTH_ADMIN_ENCRYPTION_KEY) throw new ConvexError('Administrator security setup is not configured. Contact the operator.')
  return crypto.subtle.importKey('raw', from64(process.env.AUTH_ADMIN_ENCRYPTION_KEY), 'AES-GCM', false, ['encrypt', 'decrypt'])
}
async function encrypt(secret) { const iv = crypto.getRandomValues(new Uint8Array(12)); const data = new TextEncoder().encode(secret); return `${bytes64(iv)}.${bytes64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), data)))}` }
async function decrypt(value) { const [iv, data] = value.split('.'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(iv) }, await key(), from64(data))) }
export async function totp(secret, step) {
  let bits = 0, value = 0; const bytes = []
  for (const c of secret) { value = value * 32 + alphabet.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); value &= (1 << bits) - 1 } }
  const data = new Uint8Array(8); new DataView(data.buffer).setBigUint64(0, BigInt(step))
  const hmac = await crypto.subtle.importKey('raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, data)); const offset = hash[hash.length - 1] & 15
  return String(new DataView(hash.buffer).getUint32(offset) & 0x7fffffff).slice(-6).padStart(6, '0')
}
export const status = query({ args: {}, handler: async ctx => { const a = await accountIdentity(ctx, 'admin'); const record = await ctx.db.query('adminMfa').withIndex('by_account', q => q.eq('accountId', a._id)).unique(); return { enrolled: !!record?.enabled, configured: !!process.env.AUTH_ADMIN_ENCRYPTION_KEY } } })
export const begin = mutation({ args: {}, handler: async ctx => {
  const a = await accountIdentity(ctx, 'admin'); await consume(ctx, `mfa-setup:${a._id}`, 5, 3600000)
  const old = await ctx.db.query('adminMfa').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  if (old?.enabled) throw new ConvexError('An authenticator is already enrolled.')
  const secret = base32(crypto.getRandomValues(new Uint8Array(20)))
  const fields = { accountId: a._id, encryptedSecret: await encrypt(secret), enabled: false, setupExpiresAt: Date.now() + 600000, attempts: 0 }
  if (old) await ctx.db.patch(old._id, fields); else await ctx.db.insert('adminMfa', fields)
  await audit(ctx, a._id, 'admin_mfa_setup_started')
  return { secret, uri: `otpauth://totp/Mlezi:${encodeURIComponent(a.email)}?secret=${secret}&issuer=Mlezi&algorithm=SHA1&digits=6&period=30` }
} })
export const verify = mutation({ args: { code: v.string() }, handler: async (ctx, { code }) => {
  const a = await accountIdentity(ctx, 'admin'); const record = await ctx.db.query('adminMfa').withIndex('by_account', q => q.eq('accountId', a._id)).unique()
  if (!record || !record.enabled && record.setupExpiresAt < Date.now()) throw new ConvexError('Start authenticator setup again.')
  // Persist failed attempts by returning an error result rather than throwing.
  if (record.attempts >= 5 && record.setupExpiresAt > Date.now()) return { ok: false, error: 'Too many attempts. Wait ten minutes before trying again.' }
  const step = Math.floor(Date.now() / 30000), secret = await decrypt(record.encryptedSecret)
  let accepted
  for (const offset of [-1, 0, 1]) if (/^\d{6}$/.test(code) && code === await totp(secret, step + offset) && step + offset > (record.lastStep ?? -1)) accepted = step + offset
  if (accepted === undefined) { await ctx.db.patch(record._id, { attempts: record.setupExpiresAt > Date.now() ? record.attempts + 1 : 1, setupExpiresAt: record.setupExpiresAt > Date.now() ? record.setupExpiresAt : Date.now() + 600000 }); await audit(ctx, a._id, 'admin_mfa_failed'); return { ok: false, error: 'Invalid or already used authenticator code.' } }
  await ctx.db.patch(record._id, { enabled: true, attempts: 0, lastStep: accepted, setupExpiresAt: Date.now() + 600000 })
  const sessionId = await getAuthSessionId(ctx), old = await ctx.db.query('adminSessions').withIndex('by_session', q => q.eq('sessionId', sessionId)).unique()
  const fields = { accountId: a._id, sessionId, expiresAt: Date.now() + 15 * 60000 }
  if (old) await ctx.db.patch(old._id, fields); else await ctx.db.insert('adminSessions', fields)
  await audit(ctx, a._id, 'admin_mfa_verified')
  return { ok: true }
} })

// Operator-only recovery after verifying account ownership out of band.
export const resetEnrollment = internalMutation({ args: { accountId: v.id('accounts') }, handler: async (ctx,{accountId}) => {
  const a=await ctx.db.get(accountId);if(a?.role!=='admin')throw new ConvexError('Administrator account not found.')
  const mfa=await ctx.db.query('adminMfa').withIndex('by_account',q=>q.eq('accountId',accountId)).unique();if(mfa)await ctx.db.delete(mfa._id)
  for(const grant of await ctx.db.query('adminSessions').collect())if(grant.accountId===accountId)await ctx.db.delete(grant._id)
  if(a.authSubject){const userId=ctx.db.normalizeId('users',a.authSubject);if(userId)for(const s of await ctx.db.query('authSessions').withIndex('userId',q=>q.eq('userId',userId)).collect()){for(const r of await ctx.db.query('authRefreshTokens').withIndex('sessionId',q=>q.eq('sessionId',s._id)).collect())await ctx.db.delete(r._id);await ctx.db.delete(s._id)}}
  await audit(ctx,undefined,'admin_mfa_reset_by_operator',accountId)
} })

export const checkRuntime = internalMutation({ args: {}, handler: async () => ({
  authenticatorCryptoReady: await decrypt(await encrypt('runtime-test-only')) === 'runtime-test-only' && await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',1) === '287082',
}) })
