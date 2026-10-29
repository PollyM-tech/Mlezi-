import { internalMutation } from './_generated/server.js'
import { v } from 'convex/values'
import { DAY, PLANS, fail } from './lib/marketplace.js'

// For the future server-side Daraja reconciliation action only. No public
// payment callback or browser can mark a payment complete or grant membership.
export const settle = internalMutation({ args: { paymentId: v.id('payments'), resultCode: v.number() }, handler: async (ctx, { paymentId, resultCode }) => {
  const payment = await ctx.db.get(paymentId)
  if (!payment || payment.status !== 'pending') return payment
  const plan = PLANS[payment.planCode]
  const account = await ctx.db.get(payment.accountId)
  if (!plan || plan.role !== account?.role || payment.type !== plan.type || payment.amount !== plan.amount || payment.durationDays !== plan.days) fail('Payment does not match server pricing')
  if (resultCode === 0) {
    const table = plan.role === 'employer' ? 'employers' : 'caregivers'
    const profile = await ctx.db.query(table).withIndex('by_account', q => q.eq('accountId', payment.accountId)).unique()
    if (!profile) fail('Membership profile not found')
    const field = plan.role === 'employer' ? 'accessExpiresAt' : 'premiumExpiresAt'
    await ctx.db.patch(profile._id, { [field]: Math.max(profile[field] || 0, Date.now()) + plan.days * DAY })
  }
  await ctx.db.patch(paymentId, { status: resultCode === 0 ? 'completed' : 'failed', resultCode, resultDescription: resultCode === 0 ? 'Payment confirmed' : 'Payment not completed', updatedAt: Date.now() })
  return await ctx.db.get(paymentId)
} })
