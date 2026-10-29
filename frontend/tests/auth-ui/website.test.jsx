import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Website from '../../src/components/Website.jsx'

vi.mock('../../src/components/ConvexSession.jsx', () => ({ default: () => <main>Private account application</main> }))
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); document.head.innerHTML = '' })

it('public regional guides work without loading the authenticated application', () => {
  window.history.replaceState({}, '', '/kenya/')
  render(<Website />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Kenya')
  expect(screen.getByText(/A nanny, a maid or a househelp/)).toBeTruthy()
  expect(screen.queryByText('Private account application')).toBeNull()
  expect(screen.getByRole('link', { name: 'Explore caregivers' }).getAttribute('href')).toBe('/app/#/browse')
})
it('the separate application entry keeps private workspace pages out of indexing', async () => {
  window.history.replaceState({}, '', '/app/#/signin')
  document.head.innerHTML = '<meta name="robots" content="index, follow"><link rel="canonical" href="https://example.test/">'
  render(<Website />)
  expect(await screen.findByText('Private account application')).toBeTruthy()
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow')
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
})
