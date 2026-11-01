import { Email } from '@convex-dev/auth/providers/Email'
import { ConvexError } from 'convex/values'
import { internal } from '../_generated/api.js'
import { normalizeEmail } from './authPolicy.js'

export function emailIsConfigured() {
  return Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM && process.env.SITE_URL)
}

function numericCode() {
  // Rejection sampling avoids modulo bias. Codes have about 26 bits of entropy.
  let code = ''
  while (code.length < 8) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    for (const byte of bytes) if (byte < 250 && code.length < 8) code += String(byte % 10)
  }
  return code
}

export function emailProvider(id, kind = 'otp') {
  const magic = kind === 'magic'
  return Email({
    id, maxAge: 60 * 10,
    ...(magic ? { authorize: undefined } : { generateVerificationToken: numericCode }),
    normalizeIdentifier: normalizeEmail,
    async sendVerificationRequest({ identifier, token, url }, ctx) {
      if (!emailIsConfigured()) throw new ConvexError('Email sign-in is not configured yet. Please contact support.')
      const email = normalizeEmail(identifier)
      await ctx.runMutation(internal.emailLimits.consume, { email })
      const reset = kind === 'reset'
      const subject = reset ? 'Reset your Mlezi password' : magic ? 'Your Mlezi sign-in link' : 'Your Mlezi verification code'
      const text = magic
        ? `Sign in to Mlezi using this link:\n${url}\n\nThis link expires in 10 minutes and works once. If you did not request it, ignore this email.`
        : `${reset ? 'Reset your Mlezi password' : 'Verify your email for Mlezi'} using this code: ${token}\n\nEnter it in the Mlezi page where you requested it. It expires in 10 minutes and works once. If you did not request it, ignore this email.`
      let response
      try {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [email], subject, text }),
          signal: AbortSignal.timeout(15000),
        })
      } catch { throw new ConvexError('Unable to send your email. Please try again shortly.') }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        if (response.status === 403 && /only send testing|own email/i.test(String(detail.message || ''))) throw new ConvexError('This test sender can only send to the email address used for the Resend account. Enter that exact address. To test with other addresses, verify a sending domain first.')
        if (response.status === 403 && /verify.*domain|domain.*verif/i.test(String(detail.message || ''))) throw new ConvexError('The sending domain is not verified. The operator must verify a sending domain before sending emails from it.')
        if ([401, 403].includes(response.status)) throw new ConvexError('Email delivery is not authorized. The operator needs to check the email provider credentials and verified sender.')
        if (response.status === 429) throw new ConvexError('Too many email requests. Wait a few minutes and try again.')
        throw new ConvexError('Unable to send your email. Please try again shortly.')
      }
    },
  })
}
