import { ConvexError } from 'convex/values'

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw new ConvexError('Enter a valid email address.')
  const email = value.trim().toLowerCase()
  if (email.length > 255 || /[^\x21-\x7E]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Enter a valid email address.')
  return email
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new ConvexError('Use a password with 8 to 128 characters.')
  }
}

export function registrationDetails({ role, phone, name }) {
  if (!['caregiver', 'employer'].includes(role)) throw new ConvexError('Choose caregiver or employer.')
  if (typeof phone !== 'string' || !/^\+?[0-9][0-9 ()-]{6,30}$/.test(phone.trim())) throw new ConvexError('Enter a valid contact phone number.')
  if (typeof name !== 'string' || name.trim().length > 120 || role === 'employer' && !name.trim()) throw new ConvexError('Enter your name, using at most 120 characters.')
  return { role, phone: phone.trim(), name: name.trim() }
}

export function safeRedirect(redirectTo, siteUrl) {
  const site = new URL(siteUrl)
  const target = new URL(redirectTo, site)
  if (target.origin !== site.origin || target.username || target.password) throw new ConvexError('Invalid sign-in destination.')
  return target.toString()
}
