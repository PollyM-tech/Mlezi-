import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials'
import { createAccount, signInViaProvider } from '@convex-dev/auth/server'
import { v, ConvexError } from 'convex/values'
import { internalQuery } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { normalizeEmail } from './lib/authPolicy.js'

export const eligibility = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const password = await ctx.db.query('authAccounts').withIndex('providerAndAccountId', q => q.eq('provider', 'password').eq('providerAccountId', email)).unique()
    const account = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique()
    const verified = await ctx.db.query('users').withIndex('email', q => q.eq('email', email))
      .filter(q => q.neq(q.field('emailVerificationTime'), undefined)).first()
    return { eligible: Boolean(password || account || verified), passwordExists: Boolean(password) }
  },
})

export function passwordRecoveryProvider(passwordProvider) {
  return ConvexCredentials({
    id: 'password-recovery',
    authorize: async (params, ctx) => {
      if (params.flow !== 'reset') throw new ConvexError('Invalid password recovery request.')
      const email = normalizeEmail(params.email)
      const state = await ctx.runQuery(internal.passwordRecovery.eligibility, { email })
      // Do not reveal whether the supplied email belongs to an account.
      if (!state.eligible) return null
      if (!state.passwordExists) {
        // Imported/passwordless users need a reset target. This random secret is
        // never exposed, and this provider never returns an authenticated session.
        // The user sets their actual password through Password's verified reset.
        const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
        try {
          await createAccount(ctx, { provider: 'password', account: { id: email, secret: randomSecret },
            profile: { email }, shouldLinkViaEmail: true, shouldLinkViaPhone: false })
        } catch (error) {
          // Another recovery request can create the target while hashing runs.
          const latest = await ctx.runQuery(internal.passwordRecovery.eligibility, { email })
          if (!latest.passwordExists) throw error
        }
      }
      return await signInViaProvider(ctx, passwordProvider, {
        params: { flow: 'reset', email, redirectTo: '/app/#/signin' },
      })
    },
  })
}
