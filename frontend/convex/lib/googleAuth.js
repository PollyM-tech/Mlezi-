import { ConvexError } from 'convex/values'
import { normalizeEmail } from './authPolicy.js'

export function googleIsConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.SITE_URL)
}

export function googleProfile(profile) {
  if (profile.email_verified !== true || typeof profile.sub !== 'string' || !profile.sub) {
    throw new ConvexError('Choose a Google account with a verified email address.')
  }
  return { id: profile.sub, email: normalizeEmail(profile.email), emailVerified: true }
}
