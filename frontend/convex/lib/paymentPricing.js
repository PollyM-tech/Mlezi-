import { PLANS } from './marketplace.js'

export const TEST_ACCOUNT = 'paulinemoraa36@gmail.com'
// Disabled by default; require a short, explicitly configured test window.
export function stkPricing(account, code, now = Date.now()) {
  const plan = PLANS[code]
  if (!plan) return null
  const expires = Date.parse(process.env.MPESA_TEST_PRICING_EXPIRES_AT || '')
  const enabled = process.env.MPESA_TEST_PRICING_ENABLED === 'true'
    && account.email?.trim().toLowerCase() === TEST_ACCOUNT
    && expires > now && expires <= now + 86400000
  return { ...plan, ...(enabled ? { amount: 5, standardAmount: plan.amount, testPricingExpiresAt: expires } : {}) }
}

export function validPaymentAmount(payment, plan) {
  if (!payment.testPricingExpiresAt) return payment.amount === plan.amount
  return payment.provider === 'daraja_stk' && payment.amount === 5
    && payment.standardAmount === plan.amount
    && payment.testPricingAccountId === payment.accountId
    && payment.testPricingExpiresAt > payment.createdAt
    && payment.testPricingExpiresAt <= payment.createdAt + 86400000
}
