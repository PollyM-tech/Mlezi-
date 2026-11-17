import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import Website from '../../src/components/Website.jsx'

vi.mock('../../src/components/ConvexSession.jsx', async () => {
  const { default: PublicPages } = await import('../../src/components/PublicPages.jsx')
  return { default: ({ publicRoute, publicPage }) => publicRoute ? <PublicPages page={publicPage} /> : <main>Private account application</main> }
})
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); document.head.innerHTML = '' })

it('public regional guides work without loading the authenticated application', () => {
  window.history.replaceState({}, '', '/kenya/')
  render(<Website />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Kenya')
  expect(screen.getByText(/A nanny, a maid or a househelp/)).toBeTruthy()
  expect(screen.queryByText('Private account application')).toBeNull()
  expect(screen.getByRole('link', { name: 'Explore nannies and babysitters' }).getAttribute('href')).toBe('/caregivers')
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
  const link=screen.getAllByRole('link',{name:/I’m a nanny or babysitter/})[0]
  expect(link.getAttribute('href')).toBe('/caregiver')
  fireEvent.click(link)
  expect(await screen.findByText('Private account application')).toBeTruthy()
  expect(window.location.pathname).toBe('/caregiver')
  expect(window.location.hash).toBe('')
  window.history.back()
  await waitFor(()=>expect(screen.getByRole('heading',{level:1}).textContent).toContain('Find a nanny or'))
})
it('applies the laptop review to homepage choices and decorative icons', () => {
  window.history.replaceState({}, '', '/')
  const {container}=render(<Website />)
  expect(screen.getByLabelText('I’m looking for').value).toBe('')
  expect(screen.getByRole('option',{name:'Select care type'})).toBeTruthy()
  expect(screen.queryByLabelText('Work arrangement')).toBeNull()
  expect(screen.getByRole('option',{name:'A live-in nanny'})).toBeTruthy()
  expect(screen.getAllByRole('option',{name:'On-call / occasional care'})).toHaveLength(1)
  expect(container.querySelectorAll('#care-categories svg, #care-categories .care-type-icon')).toHaveLength(0)
  expect(container.querySelector('.landing-trust-signals').textContent).not.toMatch(/[☆✦]/)
  expect(screen.queryByText('Sponsors & Partners')).toBeNull()
  for (const link of screen.getAllByRole('link', {name:'How it works'})) expect(link.getAttribute('href')).toBe('#how-mlezi-works')
  for (const link of screen.getAllByRole('link', {name:'FAQs'})) expect(link.getAttribute('href')).toBe('#mlezi-questions')
  expect(screen.getByRole('link', {name:'Safe hiring checklist'}).getAttribute('href')).toBe('/safe-hiring/')
})


it.each([
  ['occasional_backup', '?service_type=occasional_backup'],
  ['live_in', '?service_type=live_in'],
  ['nanny', '?category=nanny'],
  ['', ''],
])('searches from one homepage choice: %s', async (value, expected) => {
  window.history.replaceState({}, '', '/')
  render(<Website />)
  const select = screen.getByLabelText('I’m looking for')
  fireEvent.change(select, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Search nannies and babysitters' }))
  await waitFor(() => expect(window.location.pathname).toBe('/caregivers'))
  expect(window.location.search).toBe(expected)
})
