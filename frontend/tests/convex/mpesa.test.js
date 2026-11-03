import {it,expect,beforeEach,afterEach,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema.js'
import {api,internal} from '../../convex/_generated/api.js'
import {mpesaSettings,mpesaPhone,initiateProvider,queryProvider} from '../../convex/lib/mpesa.js'
const modules=import.meta.glob('../../convex/**/*.js')
const DAY=86400000
beforeEach(()=>{
 vi.useFakeTimers()
 for(const [key,value] of Object.entries({MPESA_ENABLED:'true',MPESA_ENVIRONMENT:'sandbox',MPESA_SHORTCODE:'174379',MPESA_CONSUMER_KEY:'fixture-key',MPESA_CONSUMER_SECRET:'fixture-secret',MPESA_PASSKEY:'fixture-passkey',CONVEX_SITE_URL:'https://fixture.convex.site'}))vi.stubEnv(key,value)
})
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks()})
async function setup(t,suffix='parent'){
 const ids=await t.run(async ctx=>{const userId=await ctx.db.insert('users',{email:`${suffix}@example.test`,emailVerificationTime:Date.now()});const sessionId=await ctx.db.insert('authSessions',{userId,expirationTime:Date.now()+DAY});const accountId=await ctx.db.insert('accounts',{authSubject:userId,email:`${suffix}@example.test`,role:'employer',createdAt:Date.now()});const profileId=await ctx.db.insert('employers',{accountId,name:suffix,accessExpiresAt:Date.now()+DAY});return {userId,sessionId,accountId,profileId}})
 return {...ids,client:t.withIdentity({subject:`${ids.userId}|${ids.sessionId}`})}
}
const input={planCode:'employer_30_days',phone:'0712345678'}
function provider(result={ResponseCode:'0',CheckoutRequestID:'checkout-fixture',MerchantRequestID:'merchant-fixture'}){
 const fetcher=vi.fn(async url=>Response.json(url.includes('/oauth/')?{access_token:'fixture-token'}:result));vi.stubGlobal('fetch',fetcher);return fetcher
}
it('normalizes phone numbers and keeps unsafe or incomplete configuration disabled',()=>{
 expect(mpesaPhone('+254 712 345 678')).toBe('254712345678');expect(mpesaPhone('0112345678')).toBe('254112345678')
 expect(()=>mpesaPhone('1234')).toThrow();expect(mpesaSettings().enabled).toBe(true)
 vi.stubEnv('MPESA_SHORTCODE','4125123');expect(mpesaSettings().enabled).toBe(false)
 vi.stubEnv('MPESA_ENVIRONMENT','production');expect(mpesaSettings().enabled).toBe(false)
})
it('uses server pricing, isolates accounts, and prevents repeated STK or manual submissions while pending',async()=>{
 const t=convexTest(schema,modules),e=await setup(t),other=await setup(t,'other'),fetcher=provider()
 await expect(t.action(api.mpesa.start,input)).rejects.toThrow('sign in')
 await expect(e.client.action(api.mpesa.start,{...input,planCode:'caregiver_365_days'})).rejects.toThrow('valid membership')
 const first=await e.client.action(api.mpesa.start,input),again=await e.client.action(api.mpesa.start,input)
 expect(first.payment).toMatchObject({amount:300,environment:'sandbox',status:'pending',provider:'daraja_stk'});expect(again.payment.id).toBe(first.payment.id)
 expect(fetcher).toHaveBeenCalledTimes(2)
 const request=JSON.parse(fetcher.mock.calls[1][1].body);expect(request).toMatchObject({Amount:300,PartyA:'254712345678',BusinessShortCode:'174379',TransactionType:'CustomerPayBillOnline'})
 await expect(other.client.action(api.mpesa.check,{id:first.payment.id})).rejects.toThrow('not found')
 await expect(e.client.mutation(api.manualPayments.submit,{planCode:input.planCode,phone:input.phone,receipt:'TESTCODE01'})).rejects.toThrow('already awaiting')
})
it('treats callback as a hint and confirms sandbox without granting real membership',async()=>{
 const t=convexTest(schema,modules),e=await setup(t);provider();const {payment}=await e.client.action(api.mpesa.start,input)
 const expiry=(await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt
 const response=await t.fetch('/payments/mpesa/callback',{method:'POST',body:JSON.stringify({Body:{stkCallback:{CheckoutRequestID:'checkout-fixture',ResultCode:0,CallbackMetadata:{Item:[{Name:'Amount',Value:999}]}}}})})
 expect(response.status).toBe(200)
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('pending')
 provider({CheckoutRequestID:'checkout-fixture',MerchantRequestID:'merchant-fixture',ResultCode:0})
 await e.client.action(api.mpesa.check,{id:payment.id})
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('completed')
 expect((await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt).toBe(expiry)
 await t.mutation(internal.memberships.settle,{paymentId:payment.id,resultCode:0})
 expect((await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt).toBe(expiry)
})
it('keeps uncertain initiation and mismatched query responses pending; cancellation grants nothing',async()=>{
 const t=convexTest(schema,modules),e=await setup(t)
 vi.stubGlobal('fetch',vi.fn(async url=>{if(url.includes('/oauth/'))return Response.json({access_token:'fixture-token'});throw new Error('timeout')}))
 const unknown=await e.client.action(api.mpesa.start,input)
 expect(unknown.payment).toMatchObject({status:'pending',initiation_state:'unknown'})
 await t.mutation(internal.mpesa.initiated,{paymentId:unknown.payment.id,checkoutRequestId:'checkout-fixture',merchantRequestId:'merchant-fixture'})
 provider({CheckoutRequestID:'wrong',ResultCode:0});await e.client.action(api.mpesa.check,{id:unknown.payment.id})
 expect((await t.run(ctx=>ctx.db.get(unknown.payment.id))).status).toBe('pending')
 vi.advanceTimersByTime(11000)
 provider({CheckoutRequestID:'checkout-fixture',ResultCode:1032});await e.client.action(api.mpesa.check,{id:unknown.payment.id})
 expect((await t.run(ctx=>ctx.db.get(unknown.payment.id))).status).toBe('failed')
})
it('validates provider IDs, sends the configured callback and refuses mismatched query results',async()=>{
 const fetcher=provider();await initiateProvider(mpesaSettings(),{_id:'fixture-id',amount:500,phone:'254712345678'})
 expect(JSON.parse(fetcher.mock.calls[1][1].body).CallBackURL).toBe('https://fixture.convex.site/payments/mpesa/callback')
 provider({CheckoutRequestID:'wrong',ResultCode:0})
 await expect(queryProvider(mpesaSettings(),{checkoutRequestId:'expected'})).rejects.toThrow('delayed')
})
it('extends production membership once after a trusted query and never on duplicate confirmation',async()=>{
 vi.stubEnv('MPESA_ENVIRONMENT','production');vi.stubEnv('MPESA_SHORTCODE','4125123');vi.stubEnv('MPESA_LIVE_APPROVED','true');vi.stubEnv('SITE_URL','https://mlezicare.com')
 const t=convexTest(schema,modules),e=await setup(t);provider();const {payment}=await e.client.action(api.mpesa.start,input)
 const expiry=(await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt
 provider({CheckoutRequestID:'checkout-fixture',MerchantRequestID:'merchant-fixture',ResultCode:0})
 await e.client.action(api.mpesa.check,{id:payment.id});await e.client.action(api.mpesa.check,{id:payment.id})
 expect((await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt).toBe(expiry+30*DAY)
})
it('allows only the owner to close an old sandbox test, without granting access or changing a live payment',async()=>{
 const t=convexTest(schema,modules),e=await setup(t),other=await setup(t,'sandbox-outsider');provider();const {payment}=await e.client.action(api.mpesa.start,input)
 await expect(e.client.mutation(api.mpesa.closeSandboxTest,{id:payment.id})).rejects.toThrow('three minutes')
 vi.advanceTimersByTime(180001)
 await expect(other.client.mutation(api.mpesa.closeSandboxTest,{id:payment.id})).rejects.toThrow('not found')
 const expiry=(await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt
 expect((await e.client.mutation(api.mpesa.closeSandboxTest,{id:payment.id})).payment.status).toBe('failed')
 expect((await t.run(ctx=>ctx.db.get(e.profileId))).accessExpiresAt).toBe(expiry)
 await t.mutation(internal.memberships.settle,{paymentId:payment.id,resultCode:0})
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('failed')
 const liveId=await t.run(ctx=>ctx.db.insert('payments',{accountId:e.accountId,provider:'daraja_stk',environment:'production',type:'unlock_pass',planCode:'employer_30_days',amount:300,durationDays:30,status:'pending',createdAt:Date.now()-600000,updatedAt:Date.now()}))
 await expect(e.client.mutation(api.mpesa.closeSandboxTest,{id:liveId})).rejects.toThrow('Only sandbox')
 expect((await t.run(ctx=>ctx.db.get(liveId))).status).toBe('pending')
})
it('reports an inconclusive query clearly while keeping the request pending',async()=>{
 const t=convexTest(schema,modules),e=await setup(t);provider();const {payment}=await e.client.action(api.mpesa.start,input)
 provider({CheckoutRequestID:'checkout-fixture',ResultCode:4999});await e.client.action(api.mpesa.check,{id:payment.id})
 expect((await t.run(ctx=>ctx.db.get(payment.id))).resultDescription).toContain('has not returned a final result')
 vi.advanceTimersByTime(11000);provider({CheckoutRequestID:'unrelated',ResultCode:0});await e.client.action(api.mpesa.check,{id:payment.id})
 const row=await t.run(ctx=>ctx.db.get(payment.id));expect(row.status).toBe('pending');expect(row.resultDescription).toContain('Unable to confirm the result')
})
