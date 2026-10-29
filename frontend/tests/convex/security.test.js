import { it,expect,vi,afterEach } from 'vitest'
import { convexTest } from 'convex-test'
import sharp from 'sharp'
import schema from '../../convex/schema.js'
import { api,internal } from '../../convex/_generated/api.js'
import { sanitizeImage } from '../../convex/imageProcessing.js'
import { totp } from '../../convex/adminSecurity.js'
const modules=import.meta.glob('../../convex/**/*.js')
const make=()=>convexTest(schema,modules)
async function person(t,role='caregiver'){
 const ids=await t.run(async ctx=>{const userId=await ctx.db.insert('users',{email:`${role}@example.test`,emailVerificationTime:Date.now()});const sessionId=await ctx.db.insert('authSessions',{userId,expirationTime:Date.now()+86400000});const accountId=await ctx.db.insert('accounts',{authSubject:userId,email:`${role}@example.test`,role,phone:'0712345678',createdAt:Date.now()});return{userId,sessionId,accountId}})
 return {...ids,client:t.withIdentity({subject:`${ids.userId}|${ids.sessionId}`})}
}
async function upload(t,who,purpose){const id=await t.run(ctx=>ctx.storage.store(new Blob(['fixture'],{type:'image/jpeg'})));await t.run(ctx=>ctx.db.insert('uploadedAssets',{accountId:who.accountId,storageId:id,purpose,claimed:false,createdAt:Date.now()}));return id}
async function profile(t,who){const body={name:'Caregiver',service_category:'nanny',service_types:['live_in'],photo:await upload(t,who,'photo'),national_id:await upload(t,who,'national_id'),selfie:await upload(t,who,'selfie'),consent:'true'};return who.client.mutation(api.marketplace.write,{path:'/caregivers/profile',method:'POST',body})}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs()})
it('blocks caregiver app access until a stored photo exists, and submits all three images together',async()=>{
 const t=make(),who=await person(t)
 expect((await who.client.query(api.accounts.current)).status).toBe('profile_required')
 await expect(who.client.query(api.marketplace.read,{path:'/memberships'})).rejects.toThrow('photo')
 await expect(who.client.mutation(api.marketplace.write,{path:'/caregivers/profile',method:'POST',body:{name:'Care',service_category:'nanny',service_types:['live_in'],photo:await upload(t,who,'photo'),national_id:await upload(t,who,'national_id')}})).rejects.toThrow('selfie')
 const result=await profile(t,who)
 expect(result.profile.verification_status).toBe('pending')
 expect((await who.client.query(api.accounts.current)).status).toBe('ready')
 expect(await t.run(ctx=>ctx.db.query('verificationSubmissions').collect())).toHaveLength(1)
 const p=await t.run(ctx=>ctx.db.get(result.profile.id));await t.run(ctx=>ctx.storage.delete(p.photo.storageId))
 expect((await who.client.query(api.accounts.current)).status).toBe('profile_required')
 await expect(who.client.query(api.marketplace.read,{path:'/caregivers/profile'})).rejects.toThrow('photo')
})
it('decodes real images, strips metadata and rejects signatures, mismatches and extreme dimensions',async()=>{
 const source=await sharp({create:{width:20,height:30,channels:3,background:'#fff'}}).withExif({IFD0:{Artist:'Private information'}}).jpeg().toBuffer()
 expect((await sharp(source).metadata()).exif).toBeTruthy()
 const clean=await sanitizeImage(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'image/jpeg')
 const metadata=await sharp(new Uint8Array(clean)).metadata();expect(metadata.exif).toBeUndefined();expect(metadata.format).toBe('jpeg')
 await expect(sanitizeImage(new Uint8Array([137,80,78,71,13,10,26,10]).buffer,'image/png')).rejects.toThrow('complete')
 await expect(sanitizeImage(source,'image/png')).rejects.toThrow('complete')
 const huge=await sharp({create:{width:8001,height:1,channels:3,background:'#fff'}}).png().toBuffer()
 await expect(sanitizeImage(huge,'image/png')).rejects.toThrow('8000')
})
it('persists upload quotas across rejected requests and gates suspended accounts',async()=>{
 const t=make(),who=await person(t)
 for(let i=0;i<20;i++)await who.client.mutation(internal.security.reserveUpload)
 await expect(who.client.mutation(internal.security.reserveUpload)).rejects.toThrow('Too many')
 await t.run(ctx=>ctx.db.patch(who.accountId,{suspendedAt:Date.now()}))
 await expect(who.client.mutation(internal.security.reserveUpload)).rejects.toThrow('restricted')
})
it('enforces a global email budget across different email addresses',async()=>{
 const t=make()
 for(let i=0;i<20;i++)await t.mutation(internal.emailLimits.consume,{email:`person${i}@example.test`})
 await expect(t.mutation(internal.emailLimits.consume,{email:'another@example.test'})).rejects.toThrow('Too many')
})
it('requires genuine admin MFA, rejects replay and expires the grant',async()=>{
 vi.stubEnv('AUTH_ADMIN_ENCRYPTION_KEY',btoa(String.fromCharCode(...new Uint8Array(32).fill(7))))
 const t=make(),who=await person(t,'admin')
 await expect(who.client.query(api.moderation.users)).rejects.toThrow('authenticator')
 const setup=await who.client.mutation(api.adminSecurity.begin)
 expect((await t.run(ctx=>ctx.db.query('adminMfa').first())).encryptedSecret).not.toContain(setup.secret)
 const code=await totp(setup.secret,Math.floor(Date.now()/30000))
 expect(await who.client.mutation(api.adminSecurity.verify,{code})).toEqual({ok:true})
 expect(await who.client.query(api.moderation.users)).toHaveLength(1)
 expect((await who.client.mutation(api.adminSecurity.verify,{code})).ok).toBe(false)
 await t.run(async ctx=>{const grant=await ctx.db.query('adminSessions').first();await ctx.db.patch(grant._id,{expiresAt:Date.now()-1})})
 await expect(who.client.query(api.moderation.users)).rejects.toThrow('authenticator')
 expect(await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',1)).toBe('287082')
})
it('locks MFA after five wrong attempts without rolling the counter back',async()=>{
 vi.stubEnv('AUTH_ADMIN_ENCRYPTION_KEY',btoa(String.fromCharCode(...new Uint8Array(32).fill(7))))
 const t=make(),who=await person(t,'admin');await who.client.mutation(api.adminSecurity.begin)
 for(let i=0;i<5;i++)expect((await who.client.mutation(api.adminSecurity.verify,{code:'bad'})).ok).toBe(false)
 expect((await who.client.mutation(api.adminSecurity.verify,{code:'bad'})).error).toContain('Too many')
 expect((await t.run(ctx=>ctx.db.query('adminMfa').first())).attempts).toBe(5)
})
it('allows export and deletion cancellation, then purges personal files and auth data after the grace period',async()=>{
 const t=make(),who=await person(t),result=await profile(t,who)
 const exported=await who.client.mutation(api.privacy.exportOwn)
 expect(exported.account.email).toBe('caregiver@example.test');expect(JSON.stringify(exported)).not.toContain('secret');expect(exported.profile).not.toHaveProperty('photo')
 await who.client.mutation(api.privacy.request,{type:'deletion',details:'Delete',confirmEmail:'caregiver@example.test'})
 expect((await who.client.query(api.accounts.current)).status).toBe('restricted')
 await expect(who.client.query(api.marketplace.read,{path:`/caregivers/${result.profile.id}`})).rejects.toThrow('not found')
 await who.client.mutation(api.privacy.cancelDeletion)
 expect((await who.client.query(api.accounts.current)).status).toBe('ready')
 await who.client.mutation(api.privacy.request,{type:'deletion',details:'Delete',confirmEmail:'caregiver@example.test'})
 await t.run(ctx=>ctx.db.patch(who.accountId,{deletionRequestedAt:Date.now()-8*86400000}))
 await t.mutation(internal.privacy.purge,{accountId:who.accountId})
 expect(await t.run(ctx=>ctx.db.get(result.profile.id))).toBeNull()
 expect(await t.run(ctx=>ctx.db.get(who.userId))).toBeNull()
 expect((await t.run(ctx=>ctx.db.get(who.accountId))).email).toContain('@deleted.invalid')
 expect(await t.run(ctx=>ctx.db.query('uploadedAssets').collect())).toHaveLength(0)
})

it('checks the exact 18th birthday in Kenya, rejects invalid dates, and does not infer age from appearance',async()=>{
 const {confirmAdult}=await import('../../convex/lib/marketplace.js')
 const now=Date.parse('2026-10-25T22:00:00Z') // 26 October in Kenya
 expect(()=>confirmAdult('2008-10-26',now)).not.toThrow()
 expect(()=>confirmAdult('2008-10-27',now)).toThrow('18 or older')
 expect(()=>confirmAdult('2020-01-01',now)).toThrow('18 or older')
 expect(()=>confirmAdult('2000-02-30',now)).toThrow('invalid')
 expect(()=>confirmAdult('',now)).toThrow('date of birth')
})

it('keeps pending and underage caregivers out of employer search and contact access',async()=>{
 const t=make(),who=await person(t),result=await profile(t,who),e=await person(t,'employer')
 await t.run(ctx=>ctx.db.insert('employers',{accountId:e.accountId,name:'Parent',accessExpiresAt:Date.now()+86400000}))
 expect((await t.query(api.marketplace.read,{path:'/caregivers'})).profiles).toHaveLength(0)
 await expect(e.client.mutation(api.marketplace.write,{path:`/contact/unlock/${result.profile.id}`,method:'POST'})).rejects.toThrow('18+')
 const a=await person(t,'admin')
 await t.run(ctx=>ctx.db.insert('adminSessions',{accountId:a.accountId,sessionId:a.sessionId,expiresAt:Date.now()+3600000}))
 const submission=await t.run(ctx=>ctx.db.query('verificationSubmissions').first())
 const body={identity_compared:true,id_legible:true,adult_confirmed:true,birth_date:'2020-01-01'}
 await expect(a.client.mutation(api.marketplace.write,{path:`/admin/verification/${submission._id}/approve`,method:'POST',body})).rejects.toThrow('18 or older')
 expect((await t.run(ctx=>ctx.db.get(result.profile.id))).identityStatus).toBe('pending')
 await a.client.mutation(api.marketplace.write,{path:`/admin/verification/${submission._id}/approve`,method:'POST',body:{...body,birth_date:'1990-01-01'}})
 expect((await t.query(api.marketplace.read,{path:'/caregivers'})).profiles).toHaveLength(1)
 expect(await t.run(async ctx=>JSON.stringify(await ctx.db.get(submission._id)))).not.toContain('1990-01-01')
})

it('expires abandoned identity reviews while retaining the active profile photo and ID',async()=>{
 const t=make(),who=await person(t),result=await profile(t,who)
 const s=await t.run(ctx=>ctx.db.query('verificationSubmissions').first())
 const p=await t.run(ctx=>ctx.db.get(result.profile.id))
 const doc=await t.run(ctx=>ctx.db.query('caregiverDocuments').first())
 await t.run(ctx=>ctx.db.patch(s._id,{submittedAt:Date.now()-31*86400000}))
 await t.mutation(internal.retention.sweep)
 expect((await t.run(ctx=>ctx.db.get(s._id))).status).toBe('rejected')
 expect(await t.run(ctx=>ctx.db.system.get(s.selfie.storageId))).toBeNull()
 expect(await t.run(ctx=>ctx.db.system.get(p.photo.storageId))).toBeTruthy()
 expect(await t.run(ctx=>ctx.db.system.get(doc.nationalId.storageId))).toBeTruthy()
 expect((await t.run(ctx=>ctx.db.get(p._id))).identityStatus).toBe('unverified')
})
