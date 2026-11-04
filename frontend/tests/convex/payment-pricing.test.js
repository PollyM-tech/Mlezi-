import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.js'
import { internal } from '../../convex/_generated/api.js'
import { stkPricing, validPaymentAmount, TEST_ACCOUNT } from '../../convex/lib/paymentPricing.js'
const modules = import.meta.glob('../../convex/**/*.js')
afterEach(() => vi.unstubAllEnvs())
describe('Account-specific STK test pricing', () => {
  it('requires an enabled short window and the exact account; normal prices remain unchanged', () => {
    const now = Date.now(), account = { email: TEST_ACCOUNT }
    expect(stkPricing(account, 'employer_30_days', now).amount).toBe(300)
    vi.stubEnv('MPESA_TEST_PRICING_ENABLED', 'true')
    vi.stubEnv('MPESA_TEST_PRICING_EXPIRES_AT', new Date(now + 3600000).toISOString())
    expect(stkPricing(account, 'employer_30_days', now).amount).toBe(5)
    expect(stkPricing({email:'other@example.com'}, 'employer_30_days', now).amount).toBe(300)
    expect(stkPricing(account, 'caregiver_365_days', now).amount).toBe(5)
    expect(stkPricing(account, 'employer_30_days', now + 3600001).amount).toBe(300)
    vi.stubEnv('MPESA_TEST_PRICING_EXPIRES_AT', new Date(now + 172800000).toISOString())
    expect(stkPricing(account, 'employer_30_days', now).amount).toBe(300)
  })
  it('rejects an unauthorized low amount and mismatched authorization', () => {
    const plan={amount:300}, now=Date.now()
    expect(validPaymentAmount({amount:5},plan)).toBe(false)
    expect(validPaymentAmount({amount:5,provider:'daraja_stk',standardAmount:300,accountId:'a',testPricingAccountId:'b',createdAt:now,testPricingExpiresAt:now+1000},plan)).toBe(false)
  })
  it.each(['employer','caregiver'])('activates the selected %s plan exactly once after test pricing is disabled', async role => {
    const t=convexTest(schema,modules), now=Date.now()
    const ids=await t.run(async ctx=>{
      const accountId=await ctx.db.insert('accounts',{email:TEST_ACCOUNT,role,createdAt:now})
      const profileId=await ctx.db.insert(role==='employer'?'employers':'caregivers',{accountId,name:'Test',...(role==='caregiver'?{photoUrl:'test',photo:{provider:'cloudinary',publicId:'test'},category:'travel_nanny',services:[],yearsExperience:0,payPeriod:'monthly',availableDays:[],skills:[],ageGroups:[],languages:[],isAvailable:true,identityStatus:'unverified',ratingAverage:0,reviewCount:0,createdAt:now,updatedAt:now}:{})})
      const days=role==='employer'?30:365
      const paymentId=await ctx.db.insert('payments',{accountId,provider:'daraja_stk',environment:'production',type:role==='employer'?'unlock_pass':'caregiver_premium',planCode:role==='employer'?'employer_30_days':'caregiver_365_days',durationDays:days,amount:5,standardAmount:role==='employer'?300:500,testPricingAccountId:accountId,testPricingExpiresAt:now+1000,status:'pending',createdAt:now,updatedAt:now})
      return {profileId,paymentId,days}
    })
    vi.stubEnv('MPESA_TEST_PRICING_ENABLED','false')
    await t.mutation(internal.memberships.settle,{paymentId:ids.paymentId,resultCode:0})
    const first=await t.run(ctx=>ctx.db.get(ids.profileId))
    const field=role==='employer'?'accessExpiresAt':'premiumExpiresAt'
    expect(first[field]).toBeGreaterThanOrEqual(now+ids.days*86400000)
    await t.mutation(internal.memberships.settle,{paymentId:ids.paymentId,resultCode:0})
    expect((await t.run(ctx=>ctx.db.get(ids.profileId)))[field]).toBe(first[field])
  })
})
