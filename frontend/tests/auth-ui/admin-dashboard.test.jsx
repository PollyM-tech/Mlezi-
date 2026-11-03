import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import AdminPanel from '../../src/components/AdminPanel.jsx'
import AdminIdentity from '../../src/components/AdminIdentity.jsx'
const state = vi.hoisted(() => ({ api: vi.fn(), mutation: vi.fn(), identity: [], notifications: [] }))
vi.mock('../../src/lib/api', () => ({ api: state.api }))
vi.mock('convex/react', () => ({
  useMutation: ref => args => state.mutation(getFunctionName(ref), args),
  useQuery: (ref,args) => {
    if (args === 'skip') return undefined
    const name = getFunctionName(ref)
    if (name === 'adminDashboard:overview') return { queues: Object.fromEntries(['identity','tickets','waiting','reports','operations','payments','failedEmails'].map(key => [key,{ count: 1, more: false }])), overdueTickets: 1, dueSoonTickets: 0, notifications: state.notifications }
    if (name === 'marketplace:read') return args.path === '/admin/verification' ? { submissions: state.identity } : { reports: [] }
    if (name === 'support:list') return { tickets: [], cursor: null }
    if (name === 'support:thread') return { id: args.id, subject: 'Cannot upload', status: 'open', messages: [], guest: true, guestEmail: 'guest@example.test', emails: [] }
    if (name === 'adminDashboard:failedEmails') return { emails: [{ id: 'mail1', ticketId: 'ticket1', subject: 'Cannot upload', kind: 'reply', attempts: 3 }], more: false }
    return []
  },
}))
beforeEach(() => {
  window.history.replaceState({}, '', '/admin-mlezicareaccess')
  state.identity = []; state.notifications = [{ id: 'ticket1', section: 'tickets', title: 'Cannot upload', label: 'Support overdue', urgent: true, createdAt: 1 }]
  state.api.mockReset().mockResolvedValue({ documents: { national_id: 'blob:private-id', selfie: 'blob:private-selfie' } })
  state.mutation.mockReset().mockResolvedValue(undefined)
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { cleanup(); vi.useRealTimers() })
it('opens a notified ticket directly and lets the administrator resolve it', async () => {
  render(<AdminPanel />)
  fireEvent.click(screen.getByRole('button', { name: /Support overdue/ }))
  expect(window.location.pathname).toBe('/admin-mlezicareaccess')
  expect(window.location.search).toBe('?section=tickets')
  expect(screen.getByRole('heading', { name: 'Cannot upload' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Mark resolved' }))
  await waitFor(() => expect(state.mutation).toHaveBeenCalledWith('support:resolve', { id: 'ticket1', resolved: true }))
})
it('exposes failed email recovery even for tickets outside the open queue', async () => {
  render(<AdminPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Email delivery' }))
  fireEvent.click(screen.getByRole('button', { name: 'Retry email' }))
  await waitFor(() => expect(state.mutation).toHaveBeenCalledWith('support:retryEmail', { id: 'mail1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open ticket' }))
  expect(screen.getByRole('heading', { name: 'Cannot upload' })).toBeTruthy()
})
it('shows all three identity images only after opening the private evidence and revokes blobs on close', async () => {
  state.identity = [{ id: 'review1', caregiver_id: 'caregiver1', name: 'Example Caregiver', submitted_at: '2026-11-01', photo_url: 'https://example.test/photo.jpg' }]
  render(<AdminIdentity />)
  expect(screen.queryByAltText('National ID')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open private documents' }))
  expect(await screen.findByAltText('National ID')).toBeTruthy()
  expect(screen.getByAltText('Selfie')).toBeTruthy()
  expect(screen.getByAltText('Profile photo')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close private documents' }))
  expect(screen.queryByAltText('National ID')).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-id')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-selfie')
})
it('requires an explicit approval or correction decision and clears private evidence after approval', async () => {
  state.identity = [{ id: 'review1', caregiver_id: 'caregiver1', name: 'Example Caregiver', submitted_at: '2026-11-01', photo_url: 'https://example.test/photo.jpg' }]
  render(<AdminIdentity />)
  fireEvent.click(screen.getByRole('button', { name: 'Open private documents' }))
  await screen.findByAltText('National ID')
  fireEvent.click(screen.getByLabelText('I compared the ID, selfie and profile photo and they match.'))
  fireEvent.click(screen.getByLabelText('The ID is legible.'))
  fireEvent.click(screen.getByLabelText(/I checked the date of birth/))
  fireEvent.change(screen.getByLabelText(/Date of birth shown/), { target: { value: '1995-01-01' } })
  state.api.mockResolvedValueOnce({ verification_status: 'verified' })
  fireEvent.click(screen.getByRole('button', { name: 'Approve identity' }))
  await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/verification/review1/approve', { method: 'POST', body: expect.objectContaining({ identity_compared: true, id_legible: true, adult_confirmed: true, birth_date: '1995-01-01' }) }))
  expect(await screen.findByText('Identity check approved.')).toBeTruthy()
  expect(screen.queryByAltText('National ID')).toBeNull()
})
it('follows browser Back when switching administration sections', () => {
  render(<AdminPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Identity checks', exact: true }))
  expect(screen.getByRole('heading', { name: 'Pending identity checks' })).toBeTruthy()
  act(() => { window.history.replaceState({}, '', '/admin-mlezicareaccess'); window.dispatchEvent(new PopStateEvent('popstate')) })
  expect(screen.getByRole('heading', { name: 'Your administration desk' })).toBeTruthy()
})
