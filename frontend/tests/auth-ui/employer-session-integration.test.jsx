import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import ConvexSession from '../../src/components/ConvexSession.jsx'
import { configureConvexSession } from '../../src/lib/api.js'
const state = vi.hoisted(() => ({ auth: { isAuthenticated: true, isLoading: false, fetchAccessToken: async () => 'fixture' }, session: null, queryArgs: [], request: vi.fn(), signOut: vi.fn() }))
vi.mock('@convex-dev/auth/react', () => ({ ConvexAuthProvider: ({children}) => children, useConvexAuth: () => state.auth, useAuthActions: () => ({ signIn: vi.fn(), signOut: state.signOut }) }))
vi.mock('convex/react', () => ({
  useConvexAuth: () => state.auth,
  useMutation: () => vi.fn(),
  useQuery: (ref,args) => {
    if (args === 'skip') return undefined
    if (getFunctionName(ref) !== 'accounts:current') throw new Error('Unexpected query in employer journey')
    state.queryArgs.push(args.refresh)
    return args.refresh === state.queryArgs[0] ? state.session : undefined
  },
}))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => ({}), detachConvexClient: vi.fn() }))
// Only the transport is simulated. ConvexSession, App, Discovery and account forms
// are the production components, with the real session/API bridge and router.
vi.mock('../../src/lib/convexApi.js', () => ({ nativeConvexApi: (...args) => state.request(...args) }))
beforeEach(() => {
  vi.useFakeTimers(); sessionStorage.clear(); localStorage.clear(); configureConvexSession(null)
  state.queryArgs = []; state.signOut.mockReset()
  state.session = { status: 'ready', account: { id: 'parent1', role: 'employer', email: 'parent@example.test' } }
  state.request.mockReset().mockImplementation(async path => {
    if (path === '/auth/me') return {user: state.session.account}
    if (path === '/employers/profile') return {profile: {name: 'Example Parent', phone: '0712345678', email: 'parent@example.test'}}
    return {profiles: [], total: 0}
  })
})
afterEach(() => { cleanup(); configureConvexSession(null); vi.useRealTimers() })

it('keeps actual employer care requirements through three minutes, reactive updates and duplicate history events', async () => {
  window.history.replaceState({}, '', '/caregivers')
  let view
  await act(async () => { view = render(<ConvexSession />); await vi.dynamicImportSettled() })
  const keyword = screen.getByLabelText(/Name or keyword/)
  fireEvent.change(keyword, {target: {value: 'Newborn travel nanny'}})
  fireEvent.change(screen.getByLabelText('Caregiver category'), {target: {value: 'travel_nanny'}})
  fireEvent.change(screen.getByLabelText(/Maximum budget/), {target: {value: '18000'}})
  for (let i = 0; i < 6; i++) {
    await act(async () => { vi.advanceTimersByTime(30000); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByLabelText(/Name or keyword/)).toBe(keyword)
    expect(keyword.value).toBe('Newborn travel nanny')
  }
  state.session = {...state.session, account: {...state.session.account, name: 'Updated Parent'}}
  await act(async () => view.rerender(<ConvexSession />))
  expect(screen.getByLabelText('Caregiver category').value).toBe('travel_nanny')
  expect(screen.getByLabelText(/Maximum budget/).value).toBe('18000')
  expect(new Set(state.queryArgs).size).toBe(1)
  expect(state.signOut).not.toHaveBeenCalled()
})

it('keeps unsaved employer account details through the same timing and history events', async () => {
  window.history.replaceState({}, '', '/account')
  await act(async () => { render(<ConvexSession />); await vi.dynamicImportSettled() })
  const name = screen.getByLabelText('Full name')
  fireEvent.change(name, {target: {value: 'Unsaved Parent Name'}})
  await act(async () => { vi.advanceTimersByTime(180000); window.dispatchEvent(new PopStateEvent('popstate')) })
  expect(screen.getByLabelText('Full name')).toBe(name)
  expect(name.value).toBe('Unsaved Parent Name')
  expect(state.signOut).not.toHaveBeenCalled()
})

it.each(['employer', 'caregiver'])('shows the %s profile name in the header instead of the login email', async role => {
  state.session.account = { id: 'parent1', role, name: 'Registration Name', email: 'private@example.test', profile: { name: 'Profile Name' } }
  window.history.replaceState({}, '', '/caregivers')
  let view
  await act(async () => { view = render(<ConvexSession />); await vi.dynamicImportSettled() })
  expect(view.container.querySelector('.account-name').textContent).toBe('Profile Name')
  expect(view.container.querySelector('.header-actions').textContent).not.toContain('private@example.test')
})
