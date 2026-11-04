import {it,expect,beforeEach,afterEach,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema.js'
import {api,internal} from '../../convex/_generated/api.js'
import {queryProvider,mpesaSettings} from '../../convex/lib/mpesa.js'
import {LEGAL_VERSION} from '../../convex/lib/legalPolicy.js'
const modules=import.meta.glob('../../convex/**/*.js')
const DAY=86400000
beforeEach(()=>{vi.useFakeTimers();for(const[k,v]of Object.entries({MPESA_ENABLED:'true',MPESA_ENVIRONMENT:'sandbox',MPESA_SHORTCODE:'174379',MPESA_CONSUMER_KEY:'fixture',MPESA_CONSUMER_SECRET:'fixture',MPESA_PASSKEY:'fixture',CONVEX_SITE_URL:'https://fixture.convex.site'}))vi.stubEnv(k,v)})
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals()})
async function owner(t,suffix='parent'){
 const ids=await t.run(async ctx=>{const userId=await ctx.db.insert('users',{email:`${suffix}@example.test`,emailVerificationTime:Date.now()});const sessionId=await ctx.db.insert('authSessions',{userId,expirationTime:Date.now()+DAY});const accountId=await ctx.db.insert('accounts',{authSubject:userId,email:`${suffix}@example.test`,role:'employer',createdAt:Date.now()});const profileId=await ctx.db.insert('employers',{accountId,name:suffix});return{userId,sessionId,accountId,profileId}});return{...ids,client:t.withIdentity({subject:`${ids.userId}|${ids.sessionId}`})}
}
const input={planCode:'employer_30_days',phone:'0712345678',termsAccepted:true,termsVersion:LEGAL_VERSION}
const provider=(result={ResponseCode:'0',CheckoutRequestID:'fixture-checkout',MerchantRequestID:'fixture-merchant'})=>{const fetcher=vi.fn(async url=>Response.json(url.includes('/oauth/')?{access_token:'fixture-token'}:result));vi.stubGlobal('fetch',fetcher);return fetcher}
it('requires current terms before sending a request and records consent with server pricing',async()=>{
 const t=convexTest(schema,modules),o=await owner(t),fetcher=provider()
 await expect(o.client.action(api.mpesa.start,{...input,termsAccepted:false})).rejects.toThrow('Terms of Service')
 await expect(o.client.action(api.mpesa.start,{...input,termsVersion:'old'})).rejects.toThrow('Terms of Service')
 expect(fetcher).not.toHaveBeenCalled()
 const {payment}=await o.client.action(api.mpesa.start,input);const record=await t.run(ctx=>ctx.db.get(payment.id))
 expect(record).toMatchObject({amount:300,environment:'sandbox',termsVersion:LEGAL_VERSION});expect(record.termsAcceptedAt).toBeGreaterThan(0)
 expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({Amount:300,TransactionType:'CustomerPayBillOnline',PartyB:'174379'})
})
it('keeps unresolved requests idempotent and only replaces explicitly authorized stale sandbox tests',async()=>{
 const t=convexTest(schema,modules),o=await owner(t),fetcher=provider();const first=await o.client.action(api.mpesa.start,input)
 expect((await o.client.action(api.mpesa.start,input)).payment.id).toBe(first.payment.id);expect(fetcher).toHaveBeenCalledTimes(2)
 await expect(o.client.action(api.mpesa.start,{...input,replaceSandbox:true})).rejects.toThrow('three minutes')
 vi.setSystemTime(Date.now()+180001);provider({ResponseCode:'0',CheckoutRequestID:'second-checkout'});const next=await o.client.action(api.mpesa.start,{...input,replaceSandbox:true})
 expect(next.payment.id).not.toBe(first.payment.id);expect((await t.run(ctx=>ctx.db.get(first.payment.id))).status).toBe('failed')
 await t.run(ctx=>ctx.db.patch(next.payment.id,{environment:'production',createdAt:Date.now()-600000}))
 await expect(o.client.action(api.mpesa.start,{...input,replaceSandbox:true})).rejects.toThrow('still pending')
})
it('verifies provider references, isolates accounts and never activates membership on sandbox success',async()=>{
 const t=convexTest(schema,modules),o=await owner(t),other=await owner(t,'other');provider();const{payment}=await o.client.action(api.mpesa.start,input)
 await expect(other.client.action(api.mpesa.check,{id:payment.id})).rejects.toThrow('not found')
 provider({CheckoutRequestID:'unrelated',ResultCode:0});await o.client.action(api.mpesa.check,{id:payment.id});expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('pending')
 vi.setSystemTime(Date.now()+61000);provider({CheckoutRequestID:'fixture-checkout',MerchantRequestID:'fixture-merchant',ResultCode:0});await o.client.action(api.mpesa.check,{id:payment.id})
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('completed');expect((await t.run(ctx=>ctx.db.get(o.profileId))).accessExpiresAt).toBeUndefined()
 await t.mutation(internal.memberships.settle,{paymentId:payment.id,resultCode:0});expect((await t.run(ctx=>ctx.db.get(o.profileId))).accessExpiresAt).toBeUndefined()
})
it('shares provider Retry-After backoff and does not trust callback success claims',async()=>{
 const t=convexTest(schema,modules),o=await owner(t);provider();const{payment}=await o.client.action(api.mpesa.start,input)
 expect((await t.fetch('/payments/mpesa/callback',{method:'POST',body:JSON.stringify({Body:{stkCallback:{CheckoutRequestID:'fixture-checkout',ResultCode:0}}})})).status).toBe(200)
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('pending')
 const fetcher=vi.fn(async url=>url.includes('/oauth/')?Response.json({access_token:'fixture-token'}):new Response('Limited',{status:429,headers:{'Retry-After':'120'}}));vi.stubGlobal('fetch',fetcher)
 await o.client.action(api.mpesa.check,{id:payment.id});vi.setSystemTime(Date.now()+61000);await o.client.action(api.mpesa.check,{id:payment.id});expect(fetcher).toHaveBeenCalledTimes(2)
 expect((await t.run(ctx=>ctx.db.get(payment.id))).status).toBe('pending')
})

it('parses numeric and string success codes from the provider',async()=>{
 provider({CheckoutRequestID:'fixture-checkout',MerchantRequestID:'fixture-merchant',ResultCode:0});expect(await queryProvider(mpesaSettings(),{checkoutRequestId:'fixture-checkout',merchantRequestId:'fixture-merchant'})).toBe(0)
 provider({CheckoutRequestID:'fixture-checkout',ResultCode:'0'});expect(await queryProvider(mpesaSettings(),{checkoutRequestId:'fixture-checkout'})).toBe(0)
})
it('settles an approved live configuration exactly once and extends an existing expiry',async()=>{
 vi.stubEnv('MPESA_ENVIRONMENT','production');vi.stubEnv('MPESA_SHORTCODE','4125123');vi.stubEnv('MPESA_LIVE_APPROVED','true');vi.stubEnv('SITE_URL','https://mlezicare.com')
 const t=convexTest(schema,modules),o=await owner(t),expiry=Date.now()+DAY
 await t.run(ctx=>ctx.db.patch(o.profileId,{accessExpiresAt:expiry}));provider();const{payment}=await o.client.action(api.mpesa.start,input)
 provider({CheckoutRequestID:'fixture-checkout',MerchantRequestID:'fixture-merchant',ResultCode:'0'});await o.client.action(api.mpesa.check,{id:payment.id});await o.client.action(api.mpesa.check,{id:payment.id})
 expect((await t.run(ctx=>ctx.db.get(o.profileId))).accessExpiresAt).toBe(expiry+30*DAY)
})
it('does not let an old sandbox attempt block live checkout, while keeping live retries idempotent',async()=>{
 vi.stubEnv('MPESA_ENVIRONMENT','production');vi.stubEnv('MPESA_SHORTCODE','4125123');vi.stubEnv('MPESA_LIVE_APPROVED','true');vi.stubEnv('SITE_URL','https://mlezicare.com')
 const t=convexTest(schema,modules),o=await owner(t),fetcher=provider()
 const sandboxId=await t.run(ctx=>ctx.db.insert('payments',{accountId:o.accountId,environment:'sandbox',provider:'daraja_stk',type:'unlock_pass',planCode:'employer_30_days',durationDays:30,amount:300,status:'pending',createdAt:Date.now(),updatedAt:Date.now()}))
 const first=await o.client.action(api.mpesa.start,input),second=await o.client.action(api.mpesa.start,input)
 expect(first.payment.id).not.toBe(sandboxId);expect(first.payment.environment).toBe('production');expect(second.payment.id).toBe(first.payment.id)
 expect(fetcher).toHaveBeenCalledTimes(2);expect((await t.run(ctx=>ctx.db.get(sandboxId))).status).toBe('pending')
})
