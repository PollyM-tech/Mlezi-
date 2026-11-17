import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nativeConvexApi, convexSiteUrl } from '../../src/lib/convexApi.js'
vi.mock('../../src/lib/imageUpload.js', () => ({ prepareUploadImage: async () => new Blob(['prepared'], {type:'image/jpeg'}) }))
const state = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => state }))
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => { vi.restoreAllMocks(); state.query.mockReset(); state.mutation.mockReset() })
it('routes public discovery and private account reads directly through Convex', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  state.query.mockResolvedValueOnce({ profiles: [] }).mockResolvedValueOnce({ user: { role: 'employer' } })
  await nativeConvexApi('/caregivers?category=travel_nanny')
  await nativeConvexApi('/auth/me')
  expect(state.query.mock.calls[0][1]).toEqual({ path: '/caregivers', params: { category: 'travel_nanny' } })
  expect(state.query.mock.calls[1][1]).toEqual({ path: '/auth/me', params: {} })
  expect(fetch).not.toHaveBeenCalled()
})
it('uploads images to Convex HTTP actions then sends only storage IDs in profile mutations', async () => {
  const fetchToken = vi.fn().mockResolvedValue('test-session-token')
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ storageId: 'test-storage-id' }) })
  const body = new FormData(); body.set('name', 'Nanny'); body.set('photo', new File(['image'], 'photo.png', { type: 'image/png' }))
  state.mutation.mockResolvedValue({ profile: { id: 'new-convex-id' } })
  await nativeConvexApi('/caregivers/profile', { method: 'POST', body }, { fetchToken })
  expect(fetch.mock.calls[0][0]).toContain('/files/upload')
  expect(fetch.mock.calls[0][1].headers['X-Upload-Purpose']).toBe('photo')
  expect(state.mutation.mock.calls[0][1]).toEqual({ path: '/caregivers/profile', method: 'POST', body: { name: 'Nanny', photo: 'test-storage-id' } })
})
it('preserves server validation and permission error status for the UI', async () => {
  state.mutation.mockRejectedValue({ data: { message: 'Renew your contact-access pass', status: 402 } })
  await expect(nativeConvexApi('/contact/unlock/id', { method: 'POST' })).rejects.toMatchObject({ status: 402, message: 'Renew your contact-access pass' })
})

it('derives the HTTP upload origin when only the cloud URL is configured, and rejects incorrect URLs', () => {
  expect(convexSiteUrl({ VITE_CONVEX_SITE_URL: 'https://auth.mlezicare.com' })).toBe('https://auth.mlezicare.com')
  expect(convexSiteUrl({ VITE_CONVEX_URL: 'https://example.convex.cloud' })).toBe('https://example.convex.site')
  expect(() => convexSiteUrl({})).toThrow('not configured')
  expect(() => convexSiteUrl({ VITE_CONVEX_SITE_URL: 'https://example.convex.cloud' })).toThrow('HTTP Actions')
  expect(() => convexSiteUrl({ VITE_CONVEX_SITE_URL: 'https://example.convex.site.evil.test' })).toThrow('HTTP Actions')
})

it('explains a blocked local document origin without signing out or leaking tokens',async()=>{
 vi.spyOn(globalThis,'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
 state.query.mockResolvedValue({allowedSignInOrigins:['https://mlezicare.com']})
 const fetchToken=vi.fn().mockResolvedValue('fixture-private-token')
 const request=nativeConvexApi('/admin/verification/fixture/documents',{}, {fetchToken})
 await expect(request).rejects.toMatchObject({status:503,message:expect.stringContaining('APP_ALLOWED_ORIGINS')})
 await expect(request).rejects.not.toThrow('fixture-private-token')
})
it('keeps actual file outages distinct from configured origin failures',async()=>{
 vi.spyOn(globalThis,'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
 state.query.mockResolvedValue({allowedSignInOrigins:[window.location.origin]})
 await expect(nativeConvexApi('/admin/verification/fixture/documents',{}, {fetchToken:async()=>'fixture-token'})).rejects.toMatchObject({status:503,message:expect.stringContaining('Unable to reach Mlezi file storage')})
})

it('reports actual upload progress and attaches an individual identity photo to the private draft',async()=>{
 const requests=[]
 class Upload {
  upload={}
  headers={}
  open(method,url){this.method=method;this.url=url;requests.push(this)}
  setRequestHeader(key,value){this.headers[key]=value}
  send(){this.upload.onprogress({lengthComputable:true,loaded:50,total:100});this.status=200;this.responseText=JSON.stringify({storageId:'uploaded-id'});this.onload()}
 }
 vi.stubGlobal('XMLHttpRequest',Upload)
 const progress=vi.fn(),body=new FormData()
 body.set('national_id',new File(['image'],'id.jpg',{type:'image/jpeg'}));body.set('consent','true')
 state.mutation.mockResolvedValue({saved:true})
 await nativeConvexApi('/onboarding/upload',{method:'POST',body,onUploadProgress:progress},{fetchToken:async()=>'test-token'})
 expect(progress.mock.calls.map(args=>args[0])).toEqual([0,50])
 expect(requests[0].headers).toMatchObject({Authorization:'Bearer test-token','X-Upload-Purpose':'national_id','X-Identity-Consent':'true'})
 expect(state.mutation.mock.calls[0][1]).toEqual({purpose:'national_id',storageId:'uploaded-id',consent:true})
})
