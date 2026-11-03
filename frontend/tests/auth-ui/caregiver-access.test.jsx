import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../../src/App.jsx'
import Discovery from '../../src/components/Discovery.jsx'
const state = vi.hoisted(() => ({ api: vi.fn(), loggedIn: false }))
vi.mock('../../src/lib/api', () => ({ api: (...args) => state.api(...args), hasSession: () => state.loggedIn, clearSession: vi.fn() }))
beforeEach(() => { state.loggedIn = false; state.api.mockReset() })
afterEach(cleanup)
it.each(['/caregivers', '/caregivers/example123'])('shows an employer sign-in gate without fetching profiles on %s', async path => {
  window.history.replaceState({}, '', path)
  render(<App />)
  expect(await screen.findByRole('heading', {name:'Sign in to meet the caregivers'})).toBeTruthy()
  expect(screen.getByRole('link', {name:'Sign in as an employer'}).getAttribute('href')).toBe('/signin')
  expect(screen.getByRole('link', {name:'Create an employer account'}).getAttribute('href')).toBe('/employer')
  expect(state.api).not.toHaveBeenCalled()
})
it('does not let a signed-in caregiver retrieve the employer listing feed', () => {
  render(<Discovery user={{id:'caregiver1',role:'caregiver'}} />)
  expect(screen.getByRole('heading', {name:'Caregiver browsing is for employers'})).toBeTruthy()
  expect(state.api).not.toHaveBeenCalled()
})
