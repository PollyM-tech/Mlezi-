import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { normalizeEmail, validatePassword, safeRedirect } from './lib/authPolicy.js'
import { createOrUpdateUser } from './lib/authUsers.js'
import { emailProvider } from './lib/email.js'
import { passwordRecoveryProvider } from './passwordRecovery.js'

const passwordProvider = Password({
  profile: params => ({ email: normalizeEmail(params.email) }),
  validatePasswordRequirements: validatePassword,
  verify: emailProvider('email-verification'),
  reset: emailProvider('password-reset', 'reset'),
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    passwordProvider,
    passwordRecoveryProvider(passwordProvider),
    emailProvider('email-otp'),
    emailProvider('magic-link', 'magic'),
  ],
  session: { totalDurationMs: 30 * 24 * 60 * 60 * 1000 },
  jwt: { durationMs: 15 * 60 * 1000 },
  signIn: { maxFailedAttempsPerHour: 10 },
  callbacks: {
    redirect: ({ redirectTo }) => safeRedirect(redirectTo, process.env.SITE_URL),
    createOrUpdateUser,
  },
})
