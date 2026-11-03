import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import ConvexSession from '../../src/components/ConvexSession.jsx'
const state = vi.hoisted(() => ({ session: null, firstRefresh: null, queries: [], api: vi.fn(), mutation: vi.fn() }))
vi.mock('@convex-dev/auth/react', () => ({ ConvexAuthProvider: ({ children }) => children, useConvexAuth: () => ({ isAuthenticated: true, isLoading: false, fetchAccessToken: vi.fn() }), useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }) }))
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }), useMutation: () => state.mutation,
  useQuery: (ref, args) => {
    if (getFunctionName(ref) === 'adminSecurity:status') return { enrolled: true, configured: true }
    state.queries.push(args.refresh)
    if (state.firstRefresh === null) state.firstRefresh = args.refresh
    if (state.session.account?.role === 'admin' && Date.now() >= state.session.adminExpiresAt) return { ...state.session, status: 'admin_security' }
    // A changed subscription briefly has no result, as Convex useQuery does.
    return args.refresh === state.firstRefresh ? state.session : undefined
  },
}))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => ({}), detachConvexClient: vi.fn() }))
vi.mock('../../src/lib/api.js', () => ({ configureConvexSession: vi.fn(), api: (...args) => state.api(...args) }))
vi.mock('../../src/App.jsx', async () => {
  const { default: Discovery } = await import('../../src/components/Discovery.jsx')
  return { default: () => <Discovery user={{ id: 'parent1', role: 'employer' }} /> }
})
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T00:00:05Z'))
  state.session = { status: 'ready', account: { id: 'parent1', role: 'employer' } }
  state.firstRefresh = null; state.queries = []
  state.mutation.mockReset().mockResolvedValue(null)
  state.api.mockReset().mockResolvedValue({ profiles: [], total: 0 })
  window.history.replaceState({}, '', '/caregivers')
})
afterEach(() => { cleanup(); vi.useRealTimers() })
it('preserves unfinished nanny requirements across the former 30-second session refreshes', async () => {
  let view
  await act(async () => { view = render(<ConvexSession />) })
  fireEvent.click(screen.getByRole('button', { name: 'Filter caregivers' }))
  const keyword = screen.getByLabelText(/Name or keyword/)
  fireEvent.change(keyword, { target: { value: 'Travel nanny with newborn experience' } })
  fireEvent.change(screen.getByLabelText('Caregiver category'), { target: { value: 'travel_nanny' } })
  fireEvent.change(screen.getByLabelText(/Maximum budget/), { target: { value: '18000' } })
  act(() => vi.advanceTimersByTime(180000))
  // A reactive account update must also leave the same form mounted.
  state.session = { ...state.session, account: { ...state.session.account, name: 'Parent' } }
  await act(async () => view.rerender(<ConvexSession />))
  expect(new Set(state.queries)).toEqual(new Set([0]))
  expect(screen.getByLabelText(/Name or keyword/)).toBe(keyword)
  expect(keyword.value).toBe('Travel nanny with newborn experience')
  expect(screen.getByLabelText('Caregiver category').value).toBe('travel_nanny')
  expect(screen.getByLabelText(/Maximum budget/).value).toBe('18000')
  expect(screen.queryByText('Checking your sign-in…')).toBeNull()
})
it('still rechecks an administrator precisely when the MFA grant expires', async () => {
  state.session = { status: 'ready', account: { id: 'admin1', role: 'admin' }, adminExpiresAt: Date.now() + 2 * 60 * 60000 }
  await act(async () => render(<ConvexSession />))
  act(() => vi.advanceTimersByTime(2 * 60 * 60000 - 1000))
  expect(new Set(state.queries)).toEqual(new Set([0]))
  expect(screen.queryByRole('heading', { name: 'Protect your administrator account' })).toBeNull()
  act(() => vi.advanceTimersByTime(1100))
  expect(screen.getByRole('heading', { name: 'Protect your administrator account' })).toBeTruthy()
})

it('also keeps a new employer’s account details while they complete onboarding', async () => {
  state.session = { status: 'onboarding', account: null, email: 'parent@example.test' }
  window.history.replaceState({}, '', '/employer')
  await act(async () => render(<ConvexSession />))
  const name = screen.getByLabelText('Your name'), phone = screen.getByLabelText('Contact phone')
  fireEvent.change(name, { target: { value: 'Example Parent' } })
  fireEvent.change(phone, { target: { value: '0712345678' } })
  act(() => vi.advanceTimersByTime(180000))
  expect(new Set(state.queries)).toEqual(new Set([0]))
  expect(screen.getByLabelText('Your name')).toBe(name)
  expect(name.value).toBe('Example Parent')
  expect(phone.value).toBe('0712345678')
})
