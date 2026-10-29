import { it, expect, vi, beforeEach } from 'vitest'
import { api, ApiError, configureConvexSession, hasSession, clearSession } from '../../src/lib/api.js'
const state = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../../src/lib/convexApi.js', () => ({ nativeConvexApi: (...args) => state.request(...args) }))
beforeEach(() => { configureConvexSession(null); state.request.mockReset(); vi.restoreAllMocks(); sessionStorage.clear() })
function session(identity = 'account-1') { const s = { identity, authenticated: true, signOut: vi.fn().mockResolvedValue(undefined) }; configureConvexSession(s); return s }
it('always uses Convex for public requests without a backend selector or HTTP fallback', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  state.request.mockResolvedValue({ profiles: [] })
  expect(await api('/caregivers', { authenticated: false })).toEqual({ profiles: [] })
  expect(state.request).toHaveBeenCalledWith('/caregivers', { method: 'GET', body: undefined }, null)
  expect(fetch).not.toHaveBeenCalled()
})
it('ignores retired Flask refresh tokens and requires a native session', async () => {
  sessionStorage.setItem('mlezi-session', 'retired-token')
  expect(hasSession()).toBe(false)
  await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 })
  expect(state.request).not.toHaveBeenCalled()
})
it('dispatches native session revocation and signs out through Convex Auth', async () => {
  const s = session(), events = vi.spyOn(window, 'dispatchEvent')
  state.request.mockRejectedValue(new ApiError('Revoked', 401))
  await expect(api('/auth/me')).rejects.toThrow('Revoked')
  expect(s.signOut).toHaveBeenCalledOnce()
  expect(events.mock.calls.map(([e]) => e.type)).toContain('mlezi-session-expired')
})
it('does not sign out a new account when an older request fails', async () => {
  let reject
  const old = session('old')
  state.request.mockImplementation(() => new Promise((_, fail) => { reject = fail }))
  const pending = api('/auth/me')
  await vi.waitFor(() => expect(reject).toBeTypeOf('function'))
  const current = session('new')
  reject(new ApiError('Old session expired', 401))
  await expect(pending).rejects.toThrow('Old session')
  expect(old.signOut).not.toHaveBeenCalled(); expect(current.signOut).not.toHaveBeenCalled()
})
it('preserves sessions on outages and uses native sign-out explicitly', async () => {
  const s = session()
  state.request.mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(api('/auth/me')).rejects.toMatchObject({ status: 0 })
  expect(s.signOut).not.toHaveBeenCalled()
  await clearSession(); expect(s.signOut).toHaveBeenCalledOnce()
})
