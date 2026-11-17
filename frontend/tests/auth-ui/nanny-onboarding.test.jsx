import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFunctionName } from 'convex/server'
import NannyOnboarding from '../../src/components/NannyOnboarding.jsx'
const state = vi.hoisted(() => ({ current: null, save: vi.fn(), submit: vi.fn(), upload: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: () => state.current, useMutation: ref => getFunctionName(ref) === 'onboarding:saveWork' ? state.save : state.submit }))
vi.mock('../../src/lib/api.js', () => ({ api: (...args) => state.upload(...args) }))
const user = { id: 'nanny-account', role: 'caregiver', name: 'Njeri', phone: '0712345678' }
const work = { name: 'Njeri', area: 'Nairobi', experience: 2, category: 'nanny', arrangement: 'live_out' }
beforeEach(() => { state.current = null; state.save.mockReset().mockResolvedValue({saved:true}); state.submit.mockReset().mockResolvedValue({}); state.upload.mockReset().mockResolvedValue({saved:true}); window.history.replaceState({}, '', '/workspace') })
afterEach(cleanup)
it('saves a short work step without asking for documents or repeating account consent', async () => {
  render(<NannyOnboarding user={user} />)
  expect(screen.getByLabelText('Your name').value).toBe('Njeri')
  expect(screen.queryByLabelText('Contact phone')).toBeNull()
  expect(screen.queryByRole('checkbox', {name:/at least 18/})).toBeNull()
  expect(screen.queryByLabelText('National ID image')).toBeNull()
  fireEvent.change(screen.getByLabelText('Your area or town'), {target:{value:'Nairobi'}})
  fireEvent.change(screen.getByLabelText('Years of experience'), {target:{value:'2'}})
  fireEvent.change(screen.getByLabelText('Preferred work arrangement'), {target:{value:'live_out'}})
  fireEvent.click(screen.getByRole('button', {name:'Save and continue'}))
  await waitFor(() => expect(state.save).toHaveBeenCalledWith({work}))
  expect(await screen.findByRole('heading', {name:'Complete your identity check'})).toBeTruthy()
  expect(screen.getByRole('button', {name:'Submit identity check'}).disabled).toBe(true)
})
it('shows per-file progress, keeps successful uploads and requires all three before submitting', async () => {
  state.current = {work, uploaded:{photo:true,national_id:false,selfie:false}}
  let resolveUpload
  state.upload.mockImplementationOnce((_path, options) => { options.onUploadProgress(45); return new Promise(resolve => {resolveUpload=resolve}) })
  render(<NannyOnboarding user={user} />)
  expect(screen.getByLabelText('National ID image').disabled).toBe(true)
  await userEvent.click(screen.getByRole('checkbox', {name:/I allow Mlezi/}))
  await userEvent.upload(screen.getByLabelText('National ID image'), new File(['id'], 'id.jpg', {type:'image/jpeg'}))
  expect(screen.getByRole('progressbar', {name:'National ID image upload progress'}).value).toBe(45)
  expect(screen.getByLabelText('Recent selfie').disabled).toBe(true)
  await act(async () => resolveUpload({saved:true}))
  expect(screen.getAllByText(/Uploaded and saved privately/)).toHaveLength(2)
  expect(screen.getByRole('button', {name:'Submit identity check'}).disabled).toBe(true)
  await userEvent.upload(screen.getByLabelText('Recent selfie'), new File(['selfie'], 'selfie.jpg', {type:'image/jpeg'}))
  expect(screen.getAllByText(/Uploaded and saved privately/)).toHaveLength(3)
  await userEvent.click(screen.getByRole('button', {name:'Submit identity check'}))
  expect(state.submit).toHaveBeenCalledWith({consent:true})
})
it('restores saved work/photos and allows leaving without discarding them', async () => {
  state.current = {work, uploaded:{photo:true,national_id:true,selfie:false}}
  render(<NannyOnboarding user={user} />)
  expect(screen.getByRole('heading', {name:'Complete your identity check'})).toBeTruthy()
  expect(screen.getAllByText(/Uploaded and saved privately/)).toHaveLength(2)
  await userEvent.click(screen.getByRole('button', {name:'Save and finish later'}))
  expect(window.location.pathname).toBe('/')
  expect(state.submit).not.toHaveBeenCalled()
  expect(state.upload).not.toHaveBeenCalled()
})
it('preserves saved photos when an individual replacement upload fails', async () => {
  state.current = {work, uploaded:{photo:true,national_id:false,selfie:false}}
  state.upload.mockRejectedValue(new Error('Connection interrupted'))
  render(<NannyOnboarding user={user} />)
  await userEvent.click(screen.getByRole('checkbox', {name:/I allow Mlezi/}))
  await userEvent.upload(screen.getByLabelText('National ID image'), new File(['id'], 'id.jpg', {type:'image/jpeg'}))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Connection interrupted')
  expect(screen.getAllByText(/Uploaded and saved privately/)).toHaveLength(1)
  expect(screen.getByRole('button', {name:'Submit identity check'}).disabled).toBe(true)
})
