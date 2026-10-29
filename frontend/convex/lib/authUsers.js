import { ConvexError } from 'convex/values'
import { consume } from './security.js'
import { normalizeEmail } from './authPolicy.js'

// Link providers by email only when the library has verified ownership, or when
// a password provider requiring email verification requests a verified target.
export async function createOrUpdateUser(ctx, args) {
  const email = normalizeEmail(args.profile.email)
  const current = args.existingUserId ? await ctx.db.get(args.existingUserId) : null
  if (args.existingUserId && !current) throw new ConvexError('This account is no longer available.')
  const proof = args.type === 'verification' && args.profile.emailVerified === true
  const mayLink = !current && (args.shouldLinkViaEmail || args.provider.type === 'email') || proof && typeof current?.emailVerificationTime !== 'number'
  let userId = args.existingUserId
  if (mayLink) {
    const verified = await ctx.db.query('users').withIndex('email', q => q.eq('email', email))
      .filter(q => q.neq(q.field('emailVerificationTime'), undefined)).take(2)
    if (verified.length > 1) throw new ConvexError('This email needs administrator review before sign-in.')
    if (verified.length === 1) userId = verified[0]._id
  }
  const values = { email, ...(proof ? { emailVerificationTime: Date.now() } : {}) }
  if (userId) await ctx.db.patch(userId, values)
  else { await consume(ctx, 'new-auth-users-minute', 20, 60000); await consume(ctx, 'new-auth-users-day', 100, 86400000); userId = await ctx.db.insert('users', values) }
  return userId
}
