import { Password } from '@convex-dev/auth/providers/Password'
import Google from '@auth/core/providers/google'
import { ConvexError } from 'convex/values'
import { convexAuth } from '@convex-dev/auth/server'
import { normalizeEmail, validatePassword, safeRedirect } from './lib/authPolicy.js'
import { createOrUpdateUser } from './lib/authUsers.js'
import { emailProvider } from './lib/email.js'
import { passwordRecoveryProvider } from './passwordRecovery.js'
import { googleProfile } from './lib/googleAuth.js'

const passwordProvider = Password({
  profile: params => ({ email: normalizeEmail(params.email) }),
  validatePasswordRequirements: validatePassword,
  verify: emailProvider('email-verification'),
  reset: emailProvider('password-reset', 'reset'),
})


// Preserve Password's hashing, verification and reset implementation. Convert its
// plain duplicate-credential error into a safe client-visible recovery result.
const authorizePassword = passwordProvider.options.authorize
passwordProvider.options.authorize = async (params, ctx) => {
  try { return await authorizePassword(params, ctx) }
  catch (error) {
    if (params.flow === 'signUp' && /Account .+ already exists|AccountAlreadyExists/i.test(error?.message || '')) {
      throw new ConvexError({ code: 'ACCOUNT_EXISTS', message: 'An account already exists for this email. Sign in with your original password, or reset your password using an email code.' })
    }
    throw error
  }
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({ profile: googleProfile, allowDangerousEmailAccountLinking: false }),
    passwordProvider,
    passwordRecoveryProvider(passwordProvider),
    emailProvider('email-otp'),
    emailProvider('magic-link', 'magic'),
  ],
  session: { totalDurationMs: 30 * 24 * 60 * 60 * 1000 },
  jwt: { durationMs: 15 * 60 * 1000 },
  signIn: { maxFailedAttempsPerHour: 10 },
  callbacks: {
    redirect: ({ redirectTo }) => safeRedirect(redirectTo, process.env.SITE_URL, process.env.APP_ALLOWED_ORIGINS),
    createOrUpdateUser,
  },
})
