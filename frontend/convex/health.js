import { queryGeneric } from 'convex/server'
import { emailIsConfigured } from './lib/email.js'
import { supportEmailProductionReady } from './lib/supportEmail.js'

// Returns no account rows, credentials or private configuration values.
export const status = queryGeneric({
  args: {},
  handler: async ctx => ({ app: 'mlezi', phase: 'marketplace', emailReady: emailIsConfigured(), paymentsEnabled: false, supportEmailReady: supportEmailProductionReady(), guestSupportReady: !!process.env.TURNSTILE_SECRET_KEY && !/^[123]x0/.test(process.env.TURNSTILE_SECRET_KEY) && (process.env.SUPPORT_ALLOWED_HOSTNAMES || '').split(',').map(s => s.trim()).includes((process.env.SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '')), minimumCaregiverAge: 18, adminMfaConfigured: !!process.env.AUTH_ADMIN_ENCRYPTION_KEY, siteOrigin: process.env.SITE_URL || null, emailSenderProductionReady: !!process.env.AUTH_EMAIL_FROM && !process.env.AUTH_EMAIL_FROM.includes('@resend.dev'),
    migrationImported: !!await ctx.db.query('migrationState').withIndex('by_key', q => q.eq('key', 'flask-marketplace-v1')).unique() }),
})
