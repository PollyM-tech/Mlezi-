import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FaqAssistant from '../../src/components/FaqAssistant.jsx'
import { FAQ_ENTRIES, findFaqs } from '../../src/lib/faq.js'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('opens with keyboard focus, shows an answer and restores focus on Escape', async () => {
  const user = userEvent.setup()
  render(<FaqAssistant />)
  const launcher = screen.getByRole('button', { name: 'Mlezi Help' })
  expect(launcher.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('dialog')).toBeNull()
  await user.click(launcher)
  expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search help' }))
  await user.click(screen.getByRole('button', { name: 'Can I browse before paying?' }))
  expect(screen.getByRole('heading', { level: 3 }).textContent).toContain('browse before paying')
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3 }))
  expect(screen.getByRole('link', { name: 'Browse caregivers' }).getAttribute('href')).toBe('/app/#/browse')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(launcher)
})
it('searches and filters locally without network calls or browser storage', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const user = userEvent.setup(), sessionBefore = sessionStorage.length, localBefore = localStorage.length
  render(<FaqAssistant />)
  await user.click(screen.getByRole('button', { name: 'Mlezi Help' }))
  await user.type(screen.getByRole('searchbox'), 'forgot password')
  expect(screen.getByRole('button', { name: /I forgot my password/ })).toBeTruthy()
  await user.clear(screen.getByRole('searchbox'))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'plans')
  expect(screen.queryByRole('button', { name: /I forgot my password/ })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'How much are the employer and Premium plans?' }))
  expect(screen.getByText(/Checkout is not enabled yet/)).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
  expect(sessionStorage.length).toBe(sessionBefore); expect(localStorage.length).toBe(localBefore)
})
it('offers support when there is no matching FAQ and clears searches on close', async () => {
  const user = userEvent.setup()
  render(<FaqAssistant />)
  await user.click(screen.getByRole('button', { name: 'Mlezi Help' }))
  await user.type(screen.getByRole('searchbox'), 'zyxunlistedissue')
  expect(screen.getByRole('status').textContent).toBe('No matching answer yet.')
  expect(screen.getByRole('link', { name: /Open a support ticket/ }).getAttribute('href')).toBe('/support/')
  await user.click(screen.getByRole('button', { name: 'Close Mlezi Help' }))
  await user.click(screen.getByRole('button', { name: 'Mlezi Help' }))
  expect(screen.getByRole('searchbox').value).toBe('')
})
it('uses existing destinations and keeps trust, planned payments and travel answers accurate', () => {
  expect(findFaqs('forgot password')[0].id).toBe('password')
  expect(findFaqs('travel nanny')[0].id).toBe('travel')
  expect(FAQ_ENTRIES.find(e => e.id === 'identity').answer).toContain('not an issuer-backed')
  expect(FAQ_ENTRIES.find(e => e.id === 'plans').answer).toContain('KES 500 for 365 days')
  expect(FAQ_ENTRIES.find(e => e.id === 'support').answer).toContain('48 hours')
  for (const entry of FAQ_ENTRIES) for (const link of entry.links) expect(link.href.startsWith('/')).toBe(true)
})
