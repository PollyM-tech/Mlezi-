import { queryGeneric } from 'convex/server'
import { emailIsConfigured } from './lib/email.js'

// Returns no account rows, credentials or private configuration values.
export const status = queryGeneric({
  args: {},
  handler: async ctx => ({ app: 'mlezi', phase: 'marketplace', emailReady: emailIsConfigured(), paymentsEnabled: false, minimumCaregiverAge: 18, adminMfaConfigured: !!process.env.AUTH_ADMIN_ENCRYPTION_KEY, siteOrigin: process.env.SITE_URL || null, emailSenderProductionReady: !!process.env.AUTH_EMAIL_FROM && !process.env.AUTH_EMAIL_FROM.includes('@resend.dev'),
    migrationImported: !!await ctx.db.query('migrationState').withIndex('by_key', q => q.eq('key', 'flask-marketplace-v1')).unique() }),
})
