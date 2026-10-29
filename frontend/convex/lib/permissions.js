import { getAuthUserId, getAuthSessionId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import { normalizeEmail } from './authPolicy.js'

export async function verifiedIdentity(ctx) {
  const userId = await getAuthUserId(ctx)
  const sessionId = await getAuthSessionId(ctx)
  if (!userId || !sessionId) throw new ConvexError('Please sign in to continue.')
  const [user, session] = await Promise.all([ctx.db.get(userId), ctx.db.get(sessionId)])
  if (!user || !session || session.userId !== userId || session.expirationTime <= Date.now()) throw new ConvexError('Your session has expired. Please sign in again.')
  if (typeof user.emailVerificationTime !== 'number') throw new ConvexError('Verify your email before continuing.')
  return { userId, email: normalizeEmail(user.email) }
}

export async function accountIdentity(ctx, ...roles) {
  const identity = await verifiedIdentity(ctx)
  const account = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
  if (!account) throw new ConvexError('Complete your account details first.')
  if (account.suspendedAt || account.deletionRequestedAt) throw new ConvexError('This account is restricted. Contact support or use your privacy request screen.')
  if (roles.length && !roles.includes(account.role)) throw new ConvexError('You do not have permission to access this resource.')
  return account
}

export async function hasProfilePhoto(ctx, account) {
  if (account.role !== 'caregiver') return true
  const profile = await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', account._id)).unique()
  if (!profile?.photo) return false
  return profile.photo.provider === 'convex' ? !!await ctx.db.system.get(profile.photo.storageId) : !!profile.photoUrl?.startsWith('https://')
}
export async function adminSessionReady(ctx, account) {
  const sessionId = await getAuthSessionId(ctx)
  const grant = await ctx.db.query('adminSessions').withIndex('by_session', q => q.eq('sessionId', sessionId)).unique()
  return !!grant && grant.accountId === account._id && grant.expiresAt > Date.now()
}
export async function requireAccount(ctx, ...roles) {
  const account = await accountIdentity(ctx, ...roles)
  if (!await hasProfilePhoto(ctx, account)) throw new ConvexError({ message: 'Upload your caregiver profile photo before continuing.', status: 403 })
  if (account.role === 'admin' && !await adminSessionReady(ctx, account)) throw new ConvexError({ message: 'Verify your authenticator code to continue.', status: 403 })
  return account
}
