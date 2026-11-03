import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import Website from '../../src/components/Website.jsx'
import { configureConvexSession } from '../../src/lib/api.js'
const state = vi.hoisted(() => ({ role: 'employer', status: 'ready', mounts: 0, unmounts: 0, revoke: vi.fn(), request: vi.fn() }))
const authKey = '__convexAuthJWT_mleziconvexauth'
vi.mock('@convex-dev/auth/react', () => ({
  ConvexAuthProvider: ({children}) => { useEffect(() => { state.mounts++; return () => { state.unmounts++ } }, []); return children },
  useConvexAuth: () => ({ isAuthenticated: !!sessionStorage.getItem('__convexAuthJWT_mleziconvexauth'), isLoading: false, fetchAccessToken: async () => 'fixture' }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: state.revoke }),
}))
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: !!sessionStorage.getItem('__convexAuthJWT_mleziconvexauth'), isLoading: false }),
  useQuery: (ref,args) => args === 'skip' ? undefined : getFunctionName(ref) === 'jobs:alerts' ? {applications:0,offers:0,more:false} : getFunctionName(ref) === 'accounts:current' ? { status: state.status, account: { id: 'account1', email: 'member@example.test', role: state.role, phone: '0712345678' } } : undefined,
  useMutation: () => vi.fn(),
}))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => ({close:vi.fn()}), detachConvexClient: vi.fn() }))
vi.mock('../../src/lib/convexApi.js', () => ({ nativeConvexApi: (...args) => state.request(...args) }))
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); configureConvexSession(null)
  sessionStorage.setItem(authKey, 'test-session-placeholder')
  state.role = 'employer'; state.status = 'ready'; state.mounts = 0; state.unmounts = 0
  state.revoke.mockReset().mockResolvedValue(undefined)
  state.request.mockReset().mockImplementation(async path => {
    if (path === '/auth/me') return { user: { id: 'account1', email: 'member@example.test', role: state.role } }
    if (path === '/employers/dashboard') return { profile: { name: 'Example Parent', email: 'member@example.test' }, counts: { shortlist: 0, contacts: 0, reviews: 0 } }
    return { profiles: [], total: 0 }
  })
  window.history.replaceState({}, '', '/workspace')
})
afterEach(() => { cleanup(); configureConvexSession(null); sessionStorage.clear() })
async function open() { await act(async () => { render(<Website />); await vi.dynamicImportSettled() }) }
it('keeps the same authenticated provider on workspace → homepage → workspace', async () => {
  await open()
  expect(await screen.findByRole('heading', { name: 'Welcome, Example.' }, { timeout: 5000 })).toBeTruthy()
  fireEvent.click(screen.getAllByRole('link', { name: 'Mlezi home' })[0])
  expect(window.location.pathname).toBe('/')
  expect(await screen.findByRole('link', { name: 'My workspace' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  expect(sessionStorage.getItem(authKey)).toBe('test-session-placeholder')
  expect(state.mounts).toBe(1); expect(state.unmounts).toBe(0)
  await act(async () => fireEvent.click(screen.getByRole('link', { name: 'My workspace' })))
  expect(window.location.pathname).toBe('/workspace')
  expect(await screen.findByRole('heading', { name: 'Welcome, Example.' }, { timeout: 5000 })).toBeTruthy()
  expect(state.mounts).toBe(1); expect(state.unmounts).toBe(0)
  expect(state.revoke).not.toHaveBeenCalled()
  window.history.back()
  expect(await screen.findByRole('link', { name: 'My workspace' })).toBeTruthy()
  expect(sessionStorage.getItem(authKey)).toBe('test-session-placeholder')
  expect(state.mounts).toBe(1); expect(state.unmounts).toBe(0)
}, 15000)
it('recognizes an existing session on a direct homepage visit', async () => {
  window.history.replaceState({}, '', '/')
  await open()
  expect(await screen.findByRole('link', { name: 'My workspace' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  expect(state.revoke).not.toHaveBeenCalled()
})
it('allows a signed-in caregiver to visit home while their photo setup is incomplete', async () => {
  state.role = 'caregiver'; state.status = 'profile_required'
  window.history.replaceState({}, '', '/')
  await open()
  expect(await screen.findByRole('link', { name: 'My workspace' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Your profile photo is required' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Find your caregiver' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Find a caregiver', exact: true })).toBeNull()
  expect(screen.queryByLabelText('I’m looking for')).toBeNull()
  expect(screen.getAllByRole('link', { name: 'Find jobs', exact: true }).length).toBeGreaterThan(0)
  await act(async () => fireEvent.click(screen.getByRole('link', { name: 'My workspace' })))
  expect(screen.getByRole('heading', { name: 'Your profile photo is required' })).toBeTruthy()
  expect(state.revoke).not.toHaveBeenCalled()
})
it('signs out only when the homepage Sign out button is clicked, and permits a fresh sign-in afterward', async () => {
  window.history.replaceState({}, '', '/')
  await open()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign out', exact: true })))
  expect(sessionStorage.getItem(authKey)).toBeNull()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy()
  expect(state.revoke).toHaveBeenCalledTimes(1)
  await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Log in' })))
  expect(window.location.pathname).toBe('/signin')
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy()
  expect(state.mounts).toBe(2)
})
it('keeps a cold signed-out homepage public without mounting an authentication provider', async () => {
  sessionStorage.clear(); window.history.replaceState({}, '', '/')
  await open()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy()
  expect(state.mounts).toBe(0)
})
