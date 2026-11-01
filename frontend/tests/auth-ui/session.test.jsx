import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConvexSession from '../../src/components/ConvexSession.jsx'
import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'

const state = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: false, fetchAccessToken: vi.fn() },
  signIn: vi.fn(), signOut: vi.fn(), mutation: vi.fn(), query: undefined,
}))
vi.mock('@convex-dev/auth/react', () => ({
  ConvexAuthProvider: ({ children }) => children,
  useConvexAuth: () => state.auth,
  useAuthActions: () => ({ signIn: state.signIn, signOut: state.signOut }),
}))
vi.mock('convex/react', () => ({ useConvexAuth: () => state.serverAuth || state.auth, useQuery: () => state.query, useMutation: () => state.mutation }))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => ({}), detachConvexClient: vi.fn() }))
vi.mock('../../src/App.jsx', () => ({ default: () => <p>Regular Mlezi app</p> }))
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear()
  state.mutation.mockReset().mockResolvedValue(null)
  state.serverAuth = null
  state.auth.isAuthenticated = false; state.auth.isLoading = false; state.query = undefined
  state.signIn.mockReset(); state.signOut.mockReset().mockResolvedValue(undefined)
  window.history.replaceState({}, '', '/#/signin')
})
afterEach(cleanup)
it('shows a retry screen for invalid or reused magic links and removes the token from the URL', async () => {
  window.history.replaceState({}, '', '/?code=expired-link-token#/signin')
  state.signIn.mockResolvedValue({ signingIn: false })
  render(<ConvexSession />)
  expect((await screen.findByRole('alert')).textContent).toContain('invalid or expired')
  expect(window.location.search).toBe('')
  await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
  expect(screen.getByText('Regular Mlezi app')).toBeTruthy()
})
it('revoked sessions get a sign-in recovery screen instead of crashing', async () => {
  state.auth.isAuthenticated = true; state.query = { status: 'expired', account: null }
  render(<ConvexSession />)
  expect(screen.getByText('Your session has expired or is no longer valid.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Return to homepage' }))
  expect(state.signOut).toHaveBeenCalledOnce()
  expect(window.location.pathname).toBe('/')
})

it.each(['#/signin', '#/join?role=employer'])('opens the workspace once an authenticated account is ready on %s', route => {
  window.history.replaceState({}, '', '/' + route)
  const view = render(<ConvexSession />)
  state.auth.isAuthenticated = true
  state.query = { status: 'ready', account: { id: 'account-1', role: 'employer' } }
  view.rerender(<ConvexSession />)
  expect(window.location.pathname).toBe('/workspace'); expect(window.location.hash).toBe('')
  expect(screen.getByText('Regular Mlezi app')).toBeTruthy()
})
it('waits for server authentication before rendering the signed-in app', () => {
  state.auth.isAuthenticated = true
  state.serverAuth = { isAuthenticated: false, isLoading: true }
  render(<ConvexSession />)
  expect(screen.getByRole('status').textContent).toContain('Checking your sign-in')
  expect(screen.queryByText('Regular Mlezi app')).toBeNull()
  expect(window.location.hash).toBe('#/signin')
})
it.each(['#/browse', '#/account', '#/caregivers/12'])('preserves an authenticated deep link to %s', route => {
  window.history.replaceState({}, '', '/' + route)
  state.auth.isAuthenticated = true
  state.query = { status: 'ready', account: { id: 'account-1' } }
  render(<ConvexSession />)
  expect(window.location.hash).toBe(route)
})

it('restricts caregivers without a photo to setup instead of rendering the workspace', () => {
 state.auth.isAuthenticated=true;state.query={status:'profile_required',account:{id:'caregiver',role:'caregiver',phone:'0712345678'}}
 render(<ConvexSession />)
 expect(screen.getByRole('heading',{name:'Your profile photo is required'})).toBeTruthy()
 expect(screen.queryByText('Regular Mlezi app')).toBeNull()
 expect(screen.getByLabelText(/Profile photo · required/).required).toBe(true)
 expect(screen.getByLabelText(/National ID image/).required).toBe(true)
 expect(screen.getByLabelText(/Recent selfie/).required).toBe(true)
})
it('repairs a missing photo using the existing profile rather than creating a duplicate',()=>{
 state.auth.isAuthenticated=true;state.query={status:'profile_required',account:{id:'caregiver',role:'caregiver'},setupProfile:{id:'existing',name:'Caregiver',photo_url:null,service_category:'nanny',service_types:['live_in'],phone:'0712345678'}}
 render(<ConvexSession />)
 expect(screen.getByRole('heading',{name:'Edit your profile'})).toBeTruthy()
 expect(screen.getByLabelText(/Profile photo · required/).required).toBe(true)
})
it('shows legal pages to a caregiver even while profile access is restricted',()=>{
 window.history.replaceState({},'', '/#/privacy')
 state.auth.isAuthenticated=true;state.query={status:'profile_required',account:{id:'caregiver',role:'caregiver'}}
 render(<ConvexSession />)
 expect(screen.getByRole('heading',{name:'Privacy notice'})).toBeTruthy()
 expect(screen.queryByText('Regular Mlezi app')).toBeNull()
})

it('requires an unchecked terms acknowledgement when completing a new verified account', async () => {
  state.auth.isAuthenticated = true; state.query = { status: 'onboarding', account: null }
  render(<ConvexSession />)
  const phone = await screen.findByLabelText('Contact phone')
  const checkbox = screen.getByRole('checkbox', { name: /I am at least 18/ })
  expect(checkbox.checked).toBe(false); expect(checkbox.required).toBe(true)
  await userEvent.type(phone, '0712345678')
  await userEvent.click(screen.getByRole('button', { name: 'Continue to my workspace' }))
  expect(state.mutation).toHaveBeenCalledTimes(1)
  await userEvent.click(checkbox)
  await userEvent.click(screen.getByRole('button', { name: 'Continue to my workspace' }))
  await waitFor(() => expect(state.mutation).toHaveBeenCalledWith(expect.objectContaining({ termsAccepted: true, termsVersion: LEGAL_VERSION })))
})

it('prefills new-tab magic-link account setup from the matching verified-email draft',async()=>{
 const draft={role:'employer',name:'Example Parent',phone:'0712345678',email:'parent@example.test',expiresAt:Date.now()+60000}
 localStorage.setItem('mlezi-registration-draft',JSON.stringify(draft))
 state.auth.isAuthenticated=true;state.query={status:'onboarding',account:null,email:'parent@example.test'}
 window.history.replaceState({},'', '/caregiver')
 render(<ConvexSession/> )
 expect((await screen.findByLabelText('Your name')).value).toBe('Example Parent')
 expect(screen.getByLabelText('Contact phone').value).toBe('0712345678')
 expect(screen.getByLabelText('I am joining as').value).toBe('employer')
})
