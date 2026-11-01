import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import Website from '../../src/components/Website.jsx'

vi.mock('../../src/components/ConvexSession.jsx', () => ({ default: () => <main>Private account application</main> }))
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); document.head.innerHTML = '' })

it('public regional guides work without loading the authenticated application', () => {
  window.history.replaceState({}, '', '/kenya/')
  render(<Website />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Kenya')
  expect(screen.getByText(/A nanny, a maid or a househelp/)).toBeTruthy()
  expect(screen.queryByText('Private account application')).toBeNull()
  expect(screen.getByRole('link', { name: 'Explore caregivers' }).getAttribute('href')).toBe('/caregivers')
})
it('the separate application entry keeps private workspace pages out of indexing', async () => {
  window.history.replaceState({}, '', '/signin')
  document.head.innerHTML = '<meta name="robots" content="index, follow"><link rel="canonical" href="https://example.test/">'
  render(<Website />)
  expect(await screen.findByText('Private account application')).toBeTruthy()
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow')
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
})

it('opens clean signup links without reloading and handles browser Back navigation', async () => {
  window.history.replaceState({}, '', '/')
  render(<Website />)
  const link=screen.getAllByRole('link',{name:/I’m a caregiver/})[0]
  expect(link.getAttribute('href')).toBe('/caregiver')
  fireEvent.click(link)
  expect(await screen.findByText('Private account application')).toBeTruthy()
  expect(window.location.pathname).toBe('/caregiver')
  expect(window.location.hash).toBe('')
  window.history.back()
  await waitFor(()=>expect(screen.getByRole('heading',{level:1}).textContent).toContain('A little care.'))
})
it('applies the laptop review to homepage choices and decorative icons', () => {
  window.history.replaceState({}, '', '/')
  const {container}=render(<Website />)
  expect(screen.getByLabelText('I’m looking for').value).toBe('')
  expect(screen.getByRole('option',{name:'Select care type'})).toBeTruthy()
  expect(screen.getByRole('option',{name:'Select work arrangement'})).toBeTruthy()
  expect(container.querySelectorAll('#care-categories svg, #care-categories .care-type-icon')).toHaveLength(0)
  expect(container.querySelector('.landing-trust-signals').textContent).not.toMatch(/[☆✦]/)
})
