import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import SupportInbox from '../../src/components/SupportInbox.jsx'
import PublicSupport from '../../src/components/PublicSupport.jsx'

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), action: vi.fn(), query: vi.fn() }))
const ticket = { id: 'fixture-ticket', subject: 'Upload fails', status: 'waiting', messages: [{ id: 'm1', sender: 'support', body: 'Please try a JPEG image.', createdAt: 1700000000000 }] }
vi.mock('convex/react', () => ({
  useQuery: (ref, args) => args === 'skip' ? undefined : getFunctionName(ref) === 'support:list' ? { tickets: [ticket], cursor: null } : ticket,
  useMutation: ref => args => mocks.mutate(getFunctionName(ref), args),
}))
vi.mock('../../src/lib/convexClient.js', () => ({ getConvexClient: () => ({ action: mocks.action, query: mocks.query }) }))
vi.mock('../../src/components/Turnstile.jsx', () => ({ default: ({ onToken }) => <button type="button" onClick={() => onToken('fixture-challenge')}>Pass spam check</button> }))
beforeEach(() => { mocks.mutate.mockReset().mockResolvedValue({ id: ticket.id }); mocks.action.mockReset().mockResolvedValue({ id: ticket.id, key: 'a'.repeat(64) }); mocks.query.mockReset().mockResolvedValue(ticket); sessionStorage.clear() })
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

it('opens an account ticket and shows private replies from Mlezi Support', async () => {
  render(<SupportInbox />)
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Upload fails' } })
  fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'My photo failed.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }))
  await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith('support:create', { subject: 'Upload fails', body: 'My photo failed.', category: 'account' }))
  expect(await screen.findByText('Please try a JPEG image.')).toBeTruthy()
  expect(screen.getByText('Mlezi Support')).toBeTruthy()
})
it('keeps the public form closed when spam protection is not configured', () => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
  render(<PublicSupport />)
  expect(screen.getByRole('button', { name: 'Submit guest ticket' }).disabled).toBe(true)
  expect(screen.getByText(/Guest submission will be available/)).toBeTruthy()
  expect(mocks.action).not.toHaveBeenCalled()
})
it('submits a signed-out ticket after the spam check and shows access without putting it in storage or the URL', async () => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'fixture-sitekey')
  const before = window.location.href
  render(<PublicSupport />)
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Upload fails' } })
  fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'My photo failed.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Load spam-protection check' }))
  fireEvent.click(screen.getByRole('button', { name: 'Pass spam check' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit guest ticket' }))
  expect(await screen.findByRole('heading', { name: 'Save your private ticket access' })).toBeTruthy()
  expect(mocks.action).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ subject: 'Upload fails', challenge: 'fixture-challenge', website: '' }))
  expect(screen.getByText('a'.repeat(64))).toBeTruthy()
  expect(window.location.href).toBe(before)
  expect(sessionStorage.length).toBe(0)
})
