import { query, mutation, internalMutation } from './_generated/server.js'
import { v, ConvexError } from 'convex/values'
import { verifiedIdentity, accountIdentity, hasProfilePhoto, adminSessionReady } from './lib/permissions.js'
import { normalizeEmail, registrationDetails } from './lib/authPolicy.js'
import { publicProfile } from './lib/marketplace.js'
import { emailIsConfigured } from './lib/email.js'
import { LEGAL_VERSION } from './lib/legalPolicy.js'

function ownAccount(account) {
  return { id: account._id, email: account.email, phone: account.phone || null, role: account.role,
    name: account.name || null, legacyId: account.legacyId ?? null, emailVerified: true }
}

export const authSettings = query({ args: {}, handler: () => ({ emailReady: emailIsConfigured(), testSender: /@resend\.dev>?$/i.test(process.env.AUTH_EMAIL_FROM || '') }) })
export const me = query({ args: {}, handler: async ctx => ownAccount(await accountIdentity(ctx)) })
export const current = query({ args: { refresh: v.optional(v.number()) }, handler: async ctx => {
  try {
    const identity = await verifiedIdentity(ctx)
    const account = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
    let status = account ? 'ready' : 'onboarding'
    if (account?.suspendedAt || account?.deletionRequestedAt) status = 'restricted'
    else if (account?.role === 'admin' && !await adminSessionReady(ctx, account)) status = 'admin_security'
    else if (account && !await hasProfilePhoto(ctx, account)) status = 'profile_required'
    const setup = status === 'profile_required' ? await ctx.db.query('caregivers').withIndex('by_account', q => q.eq('accountId', account._id)).unique() : null
    return { status, ...(status === 'onboarding' ? { email: identity.email } : {}), setupProfile: setup ? await publicProfile(ctx, setup, account) : null, account: account ? ownAccount(account) : null }
  } catch (error) {
    if (error instanceof ConvexError) return { status: 'expired', account: null }
    throw error
  }
} })

export const ensureExisting = mutation({ args: {}, handler: async ctx => {
  const identity = await verifiedIdentity(ctx)
  const owned = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
  if (owned) return ownAccount(owned)
  const reserved = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', identity.email)).unique()
  if (!reserved) return null
  if (reserved.authSubject && reserved.authSubject !== identity.userId) throw new ConvexError('This email is already linked to another account. Contact support.')
  await ctx.db.patch(reserved._id, { authSubject: identity.userId })
  return ownAccount(reserved)
} })

export const register = mutation({
  args: { role: v.union(v.literal('caregiver'), v.literal('employer')), phone: v.string(), name: v.string(), termsAccepted: v.optional(v.boolean()), termsVersion: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await verifiedIdentity(ctx)
    const owned = await ctx.db.query('accounts').withIndex('by_auth_subject', q => q.eq('authSubject', identity.userId)).unique()
    if (owned) return ownAccount(owned) // Public registration never changes an existing role.
    const reserved = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', identity.email)).unique()
    if (reserved) {
      if (reserved.authSubject && reserved.authSubject !== identity.userId) throw new ConvexError('This email is already linked to another account. Contact support.')
      await ctx.db.patch(reserved._id, { authSubject: identity.userId })
      return ownAccount(reserved)
    }
    const details = registrationDetails(args)
    if (args.termsAccepted !== true || args.termsVersion !== LEGAL_VERSION) throw new ConvexError('Read and accept the current Terms of use and acknowledge the Privacy notice before completing your account.')
    const accountId = await ctx.db.insert('accounts', { authSubject: identity.userId, email: identity.email,
      role: details.role, phone: details.phone, ...(details.name ? { name: details.name } : {}), termsAcceptedAt: Date.now(), termsVersion: LEGAL_VERSION, privacyNoticeVersion: LEGAL_VERSION, createdAt: Date.now() })
    if (details.role === 'employer') await ctx.db.insert('employers', { accountId, name: details.name })
    return ownAccount(await ctx.db.get(accountId))
  },
})

// Operator-only migration: inaccessible to public clients, with no passwords imported.
export const importLegacy = internalMutation({
  args: { records: v.array(v.object({ legacyId: v.number(), email: v.string(), role: v.union(v.literal('caregiver'), v.literal('employer'), v.literal('admin')),
    phone: v.optional(v.string()), name: v.optional(v.string()), createdAt: v.number() })) },
  handler: async (ctx, { records }) => {
    if (records.length > 100) throw new ConvexError('Import at most 100 accounts per batch.')
    let imported = 0
    for (const record of records) {
      const email = normalizeEmail(record.email)
      const existing = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique()
      if (existing) {
        if (existing.legacyId !== record.legacyId || existing.role !== record.role) throw new ConvexError('Resolve the account migration conflict before proceeding.')
        continue
      }
      const { name, ...fields } = record
      const accountId = await ctx.db.insert('accounts', { ...fields, email, ...(name ? { name } : {}) })
      if (record.role === 'employer') await ctx.db.insert('employers', { accountId, ...(name ? { name } : {}) })
      imported++
    }
    return { imported }
  },
})
