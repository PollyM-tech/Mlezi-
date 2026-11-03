import { query, mutation } from './_generated/server.js'
import { v } from 'convex/values'
import { requireAccount } from './lib/permissions.js'
import { canPublish } from './lib/listingPolicy.js'
import { CATEGORIES, SERVICES, active, approvedAdult, fail, publicProfile, text } from './lib/marketplace.js'
import { audit, consume } from './lib/security.js'
const period = v.union(v.literal('monthly'),v.literal('daily'),v.literal('hourly'))
const jobId = { id: v.id('jobs') }
const applicationId = { id: v.id('jobApplications') }
const pair = (ctx, id, accountId) => ctx.db.query('jobApplications').withIndex('by_pair',q=>q.eq('jobId',id).eq('caregiverAccountId',accountId)).unique()
const restricted = a => !a || !!a.suspendedAt || !!a.deletionRequestedAt
function amount(value) { if (!Number.isInteger(value) || value < 1 || value > 2147483647) fail('Enter a positive whole-shilling pay amount'); return value }
function jobData(j) { return { id:j._id,title:j.title,description:j.description,category:j.category,serviceTypes:j.serviceTypes,location:j.location,payMin:j.payMin,payMax:j.payMax,payPeriod:j.payPeriod,status:j.status,applicationsCount:j.applicationsCount,createdAt:j.createdAt,updatedAt:j.updatedAt } }
function applicationData(a) { return {id:a._id,jobId:a.jobId,message:a.message,proposedPay:a.proposedPay,payPeriod:a.payPeriod,status:a.status,createdAt:a.createdAt,updatedAt:a.updatedAt} }
async function viewJob(ctx, id, viewer) {
  const job = await ctx.db.get(id)
  if (!job || restricted(await ctx.db.get(job.employerAccountId))) return null
  if (viewer.role === 'admin' || job.employerAccountId === viewer._id) return job
  if (viewer.role !== 'caregiver') return null
  if (job.status !== 'open' && !await pair(ctx, id, viewer._id)) return null
  return job
}
async function candidate(ctx, account) {
  const p = await ctx.db.query('caregivers').withIndex('by_account',q=>q.eq('accountId',account._id)).unique()
  // Hidden/paused profiles may apply deliberately; they must still meet evidence
  // and account requirements. Applying shares a profile with this job's employer.
  if (!p || !await canPublish(ctx, {...p,isVisible:true}, account)) fail('Complete your profile and submit identity evidence before applying')
  return p
}
export const list = query({args:{cursor:v.optional(v.string()),category:v.optional(v.string())},handler:async(ctx,args)=>{
  const a=await requireAccount(ctx,'employer','caregiver','admin')
  if(args.category&&!CATEGORIES.includes(args.category))fail('Choose a valid care category')
  let rows=ctx.db.query('jobs')
  if(a.role==='employer')rows=rows.withIndex('by_employer',q=>q.eq('employerAccountId',a._id))
  else if(a.role==='caregiver')rows=rows.withIndex('by_status_category',q=>args.category?q.eq('status','open').eq('category',args.category):q.eq('status','open'))
  const page=await rows.order('desc').paginate({numItems:20,cursor:args.cursor||null})
  const visible=await Promise.all(page.page.map(async j=>restricted(await ctx.db.get(j.employerAccountId))?null:jobData(j)))
  return {jobs:visible.filter(Boolean),cursor:page.isDone?null:page.continueCursor}
}})
export const detail = query({args:jobId,handler:async(ctx,{id})=>{
  const a=await requireAccount(ctx,'employer','caregiver','admin'),job=await viewJob(ctx,id,a)
  if(!job)return null
  const owner=await ctx.db.get(job.employerAccountId),application=a.role==='caregiver'?await pair(ctx,id,a._id):null
  return {...jobData(job),employerName:owner.name||'Employer',ownApplication:application?applicationData(application):null,...(application?.status==='hired'&&job.hiredApplicationId===application._id?{employerContact:{email:owner.email,phone:owner.phone||null}}:{})}
}})
export const applications = query({args:{...jobId,cursor:v.optional(v.string())},handler:async(ctx,{id,cursor})=>{
  const a=await requireAccount(ctx,'employer','admin'),j=await viewJob(ctx,id,a)
  if(!j)fail('Job not found',404)
  const page=await ctx.db.query('jobApplications').withIndex('by_job',q=>q.eq('jobId',id)).order('desc').paginate({numItems:20,cursor:cursor||null})
  return {applications:await Promise.all(page.page.map(async r=>{
    const p=await ctx.db.get(r.caregiverId),account=await ctx.db.get(r.caregiverAccountId)
    return {...applicationData(r),profile:p&&!restricted(account)?await publicProfile(ctx,p):null}
  })),cursor:page.isDone?null:page.continueCursor}
}})
export const mine = query({args:{cursor:v.optional(v.string())},handler:async(ctx,{cursor})=>{
  const a=await requireAccount(ctx,'caregiver')
  const page=await ctx.db.query('jobApplications').withIndex('by_caregiver',q=>q.eq('caregiverAccountId',a._id)).order('desc').paginate({numItems:20,cursor:cursor||null})
  return {applications:await Promise.all(page.page.map(async r=>{const j=await ctx.db.get(r.jobId);return {...applicationData(r),jobTitle:j?.title||'Job unavailable',jobStatus:j?.status||'closed'}})),cursor:page.isDone?null:page.continueCursor}
}})
export const create = mutation({args:{title:v.string(),description:v.string(),category:v.string(),serviceTypes:v.array(v.string()),location:v.string(),payMin:v.number(),payMax:v.number(),payPeriod:period},handler:async(ctx,args)=>{
  const a=await requireAccount(ctx,'employer');await consume(ctx,`job-create:${a._id}`,10,86400000)
  if(!CATEGORIES.includes(args.category)||!args.serviceTypes.length||args.serviceTypes.length>SERVICES.length||args.serviceTypes.some(s=>!SERVICES.includes(s)))fail('Choose valid care requirements')
  amount(args.payMin);amount(args.payMax);if(args.payMin>args.payMax)fail('Minimum pay cannot exceed maximum pay')
  const id=await ctx.db.insert('jobs',{...args,title:text(args.title,'a job title',120,true),description:text(args.description,'job details',4000,true),location:text(args.location,'a general area',120,true),serviceTypes:[...new Set(args.serviceTypes)],employerAccountId:a._id,status:'open',applicationsCount:0,createdAt:Date.now(),updatedAt:Date.now()})
  await audit(ctx,a._id,'job_posted',id);return {id}
}})
export const apply = mutation({args:{...jobId,message:v.string(),proposedPay:v.number(),payPeriod:period},handler:async(ctx,{id,message,proposedPay,payPeriod})=>{
  const a=await requireAccount(ctx,'caregiver'),p=await candidate(ctx,a),j=await viewJob(ctx,id,a)
  if(!j||j.status!=='open')fail('This job is not accepting applications')
  const previous=await pair(ctx,id,a._id)
  if(previous&&!['withdrawn'].includes(previous.status))return {id:previous._id}
  await consume(ctx,`job-apply:${a._id}`,20,86400000)
  const fields={message:text(message,'your proposal message',2000,true),proposedPay:amount(proposedPay),payPeriod,status:'submitted',updatedAt:Date.now()}
  let result
  if(previous){await ctx.db.patch(previous._id,fields);result=previous._id}
  else{if(j.applicationsCount>=100)fail('This job has reached its application limit');result=await ctx.db.insert('jobApplications',{...fields,jobId:id,employerAccountId:j.employerAccountId,caregiverAccountId:a._id,caregiverId:p._id,createdAt:Date.now()});await ctx.db.patch(id,{applicationsCount:j.applicationsCount+1,updatedAt:Date.now()})}
  await audit(ctx,a._id,'job_application_submitted',id);return {id:result}
}})
export const setStatus = mutation({args:{...jobId,status:v.union(v.literal('open'),v.literal('paused'),v.literal('closed'))},handler:async(ctx,{id,status})=>{
  const a=await requireAccount(ctx,'employer','admin'),j=await viewJob(ctx,id,a)
  if(!j)fail('Job not found',404)
  if(j.status==='filled')fail('An accepted hire cannot be reopened; post a new job')
  if(j.offeredApplicationId){const offer=await ctx.db.get(j.offeredApplicationId);if(offer?.status==='offered')await ctx.db.patch(offer._id,{status:'declined',updatedAt:Date.now()})}
  await ctx.db.patch(id,{status,offeredApplicationId:undefined,updatedAt:Date.now()});await audit(ctx,a._id,`job_${status}`,id)
}})
export const decide = mutation({args:{...applicationId,decision:v.union(v.literal('offer'),v.literal('decline'),v.literal('withdraw'),v.literal('accept'))},handler:async(ctx,{id,decision})=>{
  const a=await requireAccount(ctx,'employer','caregiver');await consume(ctx,`job-decide:${a._id}`,30,60000);const r=await ctx.db.get(id)
  if(!r)fail('Application not found',404)
  const j=await ctx.db.get(r.jobId)
  if(!j||restricted(await ctx.db.get(j.employerAccountId)))fail('Job unavailable')
  const employer=a.role==='employer'&&j.employerAccountId===a._id,caregiver=a.role==='caregiver'&&r.caregiverAccountId===a._id
  if(!employer&&!caregiver)fail('Application not found',404)
  if(decision==='offer'){
    if(!employer)fail('Only this employer can make an offer')
    if(j.status!=='open'||r.status!=='submitted')fail('This application is not available for an offer')
    if(j.offeredApplicationId)fail('Withdraw the current offer before making another')
    if(restricted(await ctx.db.get(r.caregiverAccountId)))fail('This applicant is unavailable')
    await ctx.db.patch(id,{status:'offered',updatedAt:Date.now()});await ctx.db.patch(j._id,{offeredApplicationId:id,updatedAt:Date.now()})
  }else if(decision==='accept'){
    if(!caregiver)fail('Only the applicant can accept an offer')
    if(r.status==='hired'&&j.hiredApplicationId===id)return {ok:true}
    if(j.status!=='open'||r.status!=='offered'||j.offeredApplicationId!==id)fail('This offer is no longer available')
    const p=await candidate(ctx,a)
    if(!approvedAdult(p))fail('Your identity and adult age must be approved before accepting a hire')
    const e=await ctx.db.query('employers').withIndex('by_account',q=>q.eq('accountId',j.employerAccountId)).unique()
    const unlocked=e?await ctx.db.query('contactUnlocks').withIndex('by_pair',q=>q.eq('employerId',e._id).eq('caregiverId',p._id)).unique():null
    if(!e||!unlocked&&!active(e.accessExpiresAt))fail('The employer needs active contact access before this hire can be confirmed')
    if(!unlocked)await ctx.db.insert('contactUnlocks',{employerId:e._id,caregiverId:p._id,unlockedAt:Date.now()})
    await ctx.db.patch(id,{status:'hired',updatedAt:Date.now()});await ctx.db.patch(j._id,{status:'filled',hiredApplicationId:id,offeredApplicationId:undefined,updatedAt:Date.now()})
    // Visibility/availability belong to the caregiver and are never changed here.
  }else{
    if(decision==='withdraw'&&!caregiver||decision==='decline'&&!employer)fail('You cannot make this application decision')
    if(!['submitted','offered'].includes(r.status))fail('This application is no longer active')
    await ctx.db.patch(id,{status:decision==='withdraw'?'withdrawn':'declined',updatedAt:Date.now()})
    if(j.offeredApplicationId===id)await ctx.db.patch(j._id,{offeredApplicationId:undefined,updatedAt:Date.now()})
  }
  await audit(ctx,a._id,`job_application_${decision}`,j._id);return {ok:true}
}})

export const alerts = query({args:{},handler:async ctx=>{
  const a=await requireAccount(ctx,'employer','caregiver')
  const rows=await ctx.db.query('jobApplications').withIndex(a.role==='employer'?'by_employer_status':'by_caregiver_status',q=>a.role==='employer'?q.eq('employerAccountId',a._id).eq('status','submitted'):q.eq('caregiverAccountId',a._id).eq('status','offered')).order('desc').take(101)
  let count=0
  for(const r of rows.slice(0,100)){const j=await ctx.db.get(r.jobId);if(j&&['open','paused'].includes(j.status)&&!restricted(await ctx.db.get(j.employerAccountId))&&(a.role==='employer'||j.offeredApplicationId===r._id))count++}
  return {applications:a.role==='employer'?count:0,offers:a.role==='caregiver'?count:0,more:rows.length>100}
}})
