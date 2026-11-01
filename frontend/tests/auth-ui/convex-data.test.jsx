import { it, expect, vi, beforeEach } from 'vitest'
import { nativeConvexApi, convexSiteUrl } from '../../src/lib/convexApi.js'
vi.mock('../../src/lib/imageUpload.js', () => ({ prepareUploadImage: async () => new Blob(['prepared'], {type:'image/jpeg'}) }))
const state = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => state }))
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
  expect(convexSiteUrl({ VITE_CONVEX_URL: 'https://example.convex.cloud' })).toBe('https://example.convex.site')
  expect(() => convexSiteUrl({})).toThrow('not configured')
  expect(() => convexSiteUrl({ VITE_CONVEX_SITE_URL: 'https://example.convex.cloud' })).toThrow('HTTP Actions')
  expect(() => convexSiteUrl({ VITE_CONVEX_SITE_URL: 'https://example.convex.site.evil.test' })).toThrow('HTTP Actions')
})
