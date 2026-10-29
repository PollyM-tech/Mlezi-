import { action,internalAction,internalMutation,internalQuery,httpAction } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { requireAccount } from './lib/permissions.js'
import { PLANS,fail,find,paymentData } from './lib/marketplace.js'
import { consume,audit } from './lib/security.js'
import { mpesaSettings,mpesaPhone,initiateProvider,queryProvider } from './lib/mpesa.js'

export const prepare = internalMutation({ args:{planCode:v.string(),phone:v.string()},handler:async(ctx,args)=>{
  const account=await requireAccount(ctx,'employer','caregiver'),settings=mpesaSettings()
  if(!settings.enabled)fail('M-Pesa sandbox settings are not configured yet.',503)
  const plan=PLANS[args.planCode]
  if(!plan||plan.role!==account.role)fail('Select a valid membership plan')
  const profile=await ctx.db.query(account.role==='employer'?'employers':'caregivers').withIndex('by_account',q=>q.eq('accountId',account._id)).unique()
  if(!profile)fail('Complete your profile before purchasing membership')
  const pending=await ctx.db.query('payments').withIndex('by_account',q=>q.eq('accountId',account._id)).filter(q=>q.eq(q.field('status'),'pending')).first()
  if(pending)return{payment:pending,fresh:false}
  let phone;try{phone=mpesaPhone(args.phone)}catch{fail('Enter a valid Kenyan M-Pesa phone number')}
  await consume(ctx,`payment-starts:${account._id}`,3,600000)
  await consume(ctx,'payment-starts-global',50,3600000)
  const id=await ctx.db.insert('payments',{accountId:account._id,type:plan.type,planCode:args.planCode,durationDays:plan.days,amount:plan.amount,status:'pending',phone,
    environment:settings.environment,initiationState:'prepared',resultDescription:settings.environment==='sandbox'?'Sandbox test request is starting. No real membership payment.':'Payment request is starting.',createdAt:Date.now(),updatedAt:Date.now()})
  await audit(ctx,account._id,'payment_prepared',id)
  return{payment:await ctx.db.get(id),fresh:true}
} })
export const initiated = internalMutation({args:{paymentId:v.id('payments'),checkoutRequestId:v.string(),merchantRequestId:v.optional(v.string())},handler:async(ctx,args)=>{
  const p=await ctx.db.get(args.paymentId);if(!p||p.status!=='pending')return
  const other=await ctx.db.query('payments').withIndex('by_checkout',q=>q.eq('checkoutRequestId',args.checkoutRequestId)).unique()
  if(other&&other._id!==p._id)fail('Payment confirmation needs administrator review',409)
  if(p.checkoutRequestId&&p.checkoutRequestId!==args.checkoutRequestId)fail('Payment request changed',409)
  await ctx.db.patch(p._id,{checkoutRequestId:args.checkoutRequestId,...(args.merchantRequestId?{merchantRequestId:args.merchantRequestId}:{}),initiationState:'sent',resultDescription:p.environment==='sandbox'?'Sandbox STK request accepted. Awaiting simulated confirmation.':'Check your phone for the M-Pesa prompt.',updatedAt:Date.now()})
  await ctx.scheduler.runAfter(10000,internal.mpesa.reconcile,{paymentId:p._id})
} })
export const initiationFailed = internalMutation({args:{paymentId:v.id('payments'),uncertain:v.boolean()},handler:async(ctx,args)=>{
  const p=await ctx.db.get(args.paymentId);if(!p||p.status!=='pending'||p.checkoutRequestId)return
  await ctx.db.patch(p._id,{status:args.uncertain?'pending':'failed',initiationState:args.uncertain?'unknown':'rejected',resultDescription:args.uncertain?'Request initiation could not be confirmed. Do not pay again; contact support.':'M-Pesa could not start this request. Please try again later.',updatedAt:Date.now()})
} })
export const ownPayment = internalQuery({args:{id:v.string()},handler:async(ctx,{id})=>{
  const a=await requireAccount(ctx,'employer','caregiver'),p=await find(ctx,'payments',id)
  if(p.accountId!==a._id)fail('Payment not found',404)
  return p
} })
export const claimQuery = internalMutation({args:{paymentId:v.id('payments')},handler:async(ctx,{paymentId})=>{
  const p=await ctx.db.get(paymentId),settings=mpesaSettings()
  if(!settings.enabled||!p||p.status!=='pending'||!p.checkoutRequestId||p.environment!==settings.environment||p.lastCheckedAt&&p.lastCheckedAt>Date.now()-10000)return null
  await ctx.db.patch(paymentId,{lastCheckedAt:Date.now()});return p
} })
export const get = internalQuery({args:{paymentId:v.id('payments')},handler:(ctx,{paymentId})=>ctx.db.get(paymentId)})
export const reconcile = internalAction({args:{paymentId:v.id('payments')},handler:async(ctx,{paymentId})=>{
  const p=await ctx.runMutation(internal.mpesa.claimQuery,{paymentId});if(!p)return
  try{
    const code=await queryProvider(mpesaSettings(),p)
    if(code!==null)await ctx.runMutation(internal.memberships.settle,{paymentId,resultCode:code})
  }catch{/* Keep pending on network, provider or validation failures. Never log provider payloads. */}
} })
export const start = action({args:{planCode:v.string(),phone:v.string()},handler:async(ctx,args)=>{
  const prepared=await ctx.runMutation(internal.mpesa.prepare,args),p=prepared.payment
  if(prepared.fresh){
    try{const result=await initiateProvider(mpesaSettings(),p);await ctx.runMutation(internal.mpesa.initiated,{paymentId:p._id,...result})}
    catch(error){await ctx.runMutation(internal.mpesa.initiationFailed,{paymentId:p._id,uncertain:error.uncertain!==false})}
  }
  return{payment:paymentData(await ctx.runQuery(internal.mpesa.get,{paymentId:p._id}))}
} })
export const check = action({args:{id:v.string()},handler:async(ctx,{id})=>{
  const p=await ctx.runQuery(internal.mpesa.ownPayment,{id})
  await ctx.runAction(internal.mpesa.reconcile,{paymentId:p._id})
  return{payment:paymentData(await ctx.runQuery(internal.mpesa.get,{paymentId:p._id}))}
} })
export const callbackHint = internalMutation({args:{checkoutRequestId:v.string()},handler:async(ctx,{checkoutRequestId})=>{
  const p=await ctx.db.query('payments').withIndex('by_checkout',q=>q.eq('checkoutRequestId',checkoutRequestId)).unique()
  if(!p||p.status!=='pending')return
  await consume(ctx,`callback:${p._id}`,6,60000)
  await ctx.scheduler.runAfter(0,internal.mpesa.reconcile,{paymentId:p._id})
} })
export const callback = httpAction(async(ctx,request)=>{
  try{
    const reader=request.body?.getReader();if(!reader)return Response.json({error:'Invalid callback'},{status:400})
    let size=0;const chunks=[]
    for(;;){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return new Response(null,{status:413})}chunks.push(value)}
    const data=JSON.parse(await new Blob(chunks).text()),id=data?.Body?.stkCallback?.CheckoutRequestID
    if(typeof id!=='string'||!id||id.length>128)return Response.json({error:'Invalid callback'},{status:400})
    // The body is an untrusted hint. Ignore claimed amount, receipt and result code.
    await ctx.runMutation(internal.mpesa.callbackHint,{checkoutRequestId:id})
    return Response.json({ResultCode:0,ResultDesc:'Accepted'},{headers:{'Cache-Control':'no-store'}})
  }catch{return Response.json({error:'Unable to accept callback'},{status:400})}
})
export const pending = internalQuery({args:{},handler:ctx=>ctx.db.query('payments').withIndex('by_status',q=>q.eq('status','pending')).take(50)})
export const sweep = internalAction({args:{},handler:async ctx=>{
  if(!mpesaSettings().enabled)return
  for(const p of await ctx.runQuery(internal.mpesa.pending,{}))if(p.checkoutRequestId&&p.createdAt>Date.now()-86400000)await ctx.runAction(internal.mpesa.reconcile,{paymentId:p._id})
} })
