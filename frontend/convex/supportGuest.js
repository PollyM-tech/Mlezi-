import { action } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { categories, keyHash } from './support.js'
import { fail, text } from './lib/marketplace.js'

export const create = action({ args: { subject: v.string(), category: v.string(), body: v.string(), email: v.optional(v.string()), challenge: v.string(), website: v.optional(v.string()) }, handler: async (ctx, args) => {
  const subject = text(args.subject, 'a subject', 120, true), body = text(args.body, 'your message', 2000, true)
  if (!categories.includes(args.category) || args.website) fail('Unable to submit this ticket')
  const email = text(args.email || '', 'an email', 254).toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email, or leave it blank')
  const secret = process.env.TURNSTILE_SECRET_KEY, allowed = (process.env.SUPPORT_ALLOWED_HOSTNAMES || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!secret || !allowed.length) fail('Guest support is awaiting spam-protection setup. Signed-in support is available.')
  if (!args.challenge || args.challenge.length > 2048) fail('Complete the spam-protection check')
  let result
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: args.challenge }), signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Challenge unavailable')
    result = await response.json()
  } catch { fail('Spam protection is unavailable. Please try again.') }
  if (!result.success || result.action !== 'support' || !allowed.includes(result.hostname)) fail('The spam-protection check failed or expired. Please try again.')
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')
  const ticket = await ctx.runMutation(internal.support.createGuest, { subject, category: args.category, body, guestKeyHash: await keyHash(key), ...(email ? { guestEmail: email } : {}) })
  return { ...ticket, key }
} })
