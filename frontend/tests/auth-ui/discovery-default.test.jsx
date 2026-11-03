import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Discovery from '../../src/components/Discovery.jsx'
import { EmployerDashboard } from '../../src/components/EmployerWorkspace.jsx'
import { saveConsent, CONSENT_COOKIE } from '../../src/lib/consent.js'
import { readSearch } from '../../src/lib/search.js'
const mocks = vi.hoisted(() => ({ api: vi.fn(), empty: false }))
vi.mock('../../src/lib/api', () => ({ api: (...args) => mocks.api(...args) }))
const parent = { id: 'parent1', role: 'employer' }
const pending = { id:'care1',name:'Pending Nanny',photo_url:'https://example.test/photo.jpg',service_category:'travel_nanny',service_types:['travel'],years_experience:3,verification_status:'pending',premium_active:false,review_count:0 }
beforeEach(() => {
  sessionStorage.clear(); saveConsent('accepted'); mocks.empty = false
  mocks.api.mockReset().mockImplementation(async path => {
    if (path === '/shortlist') return { profiles: [] }
    if (path === '/employers/dashboard') return { profile: { name:'Test Parent', email:'parent@example.test' }, counts:{shortlist:0,contacts:0,reviews:0} }
    const params = new URL(path,'https://example.test').searchParams
    return { profiles: mocks.empty || params.get('category') === 'babysitter' ? [] : [pending], total:mocks.empty || params.get('category') === 'babysitter' ? 0 : 1 }
  })
})
afterEach(() => { cleanup(); sessionStorage.clear(); document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/` })
it('starts Find care with all listings, ignoring previously remembered filters and pages', async () => {
  sessionStorage.setItem('mlezi-search-parent1',JSON.stringify({filters:{category:'babysitter'},page:8,rotation:'123',savedAt:Date.now()}))
  expect(readSearch(parent.id).filters.category).toBe('babysitter')
  render(<Discovery user={parent} />)
  expect(await screen.findByRole('heading',{name:'Pending Nanny'})).toBeTruthy()
  const request = mocks.api.mock.calls.find(([path])=>path.startsWith('/caregivers?'))[0]
  const params = new URL(request,'https://example.test').searchParams
  expect(params.get('category')).toBeNull(); expect(params.get('page')).toBe('1')
  expect(screen.getByRole('button',{name:'Filter caregivers'}).getAttribute('aria-expanded')).toBe('false')
  expect(screen.getByText('Identity review pending')).toBeTruthy()
  expect(screen.queryByText('Identity checked',{exact:true})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Use last search'}))
  expect(await screen.findByRole('heading',{name:'No matching caregivers yet'})).toBeTruthy()
  expect(screen.getByLabelText('Caregiver category').value).toBe('babysitter')
})
it('applies filters only on submit and offers all listings when nothing matches', async () => {
  render(<Discovery user={parent} />)
  await screen.findByRole('heading',{name:'Pending Nanny'})
  fireEvent.click(screen.getByRole('button',{name:'Filter caregivers'}))
  const count = mocks.api.mock.calls.filter(([p])=>p.startsWith('/caregivers?')).length
  fireEvent.change(screen.getByLabelText('Caregiver category'),{target:{value:'babysitter'}})
  expect(mocks.api.mock.calls.filter(([p])=>p.startsWith('/caregivers?'))).toHaveLength(count)
  fireEvent.click(screen.getByRole('button',{name:'Find caregivers'}))
  expect(await screen.findByRole('heading',{name:'No matching caregivers yet'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Show all available caregivers'}))
  expect(await screen.findByRole('heading',{name:'Pending Nanny'})).toBeTruthy()
  expect(screen.getByLabelText('Caregiver category').value).toBe('')
})
it('honors filters explicitly requested through a homepage or shared search link', async () => {
  render(<Discovery user={parent} initialFilters={{category:'babysitter'}} />)
  expect(await screen.findByRole('heading',{name:'No matching caregivers yet'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Hide filters'})).toBeTruthy()
})
it('shows registered available caregivers directly on the employer workspace', async () => {
  render(<EmployerDashboard user={parent} />)
  expect(await screen.findByRole('heading',{name:'Pending Nanny'})).toBeTruthy()
  expect(screen.getByRole('heading',{name:'Available caregivers'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Filter caregivers'}).getAttribute('aria-expanded')).toBe('false')
})
it('distinguishes an empty marketplace from a search that has no matching results', async () => {
  mocks.empty = true
  render(<Discovery user={parent} />)
  await waitFor(()=>expect(screen.getByRole('heading',{name:'No available caregivers yet'})).toBeTruthy())
  expect(screen.queryByRole('heading',{name:'No matching caregivers yet'})).toBeNull()
})
