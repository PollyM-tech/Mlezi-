import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CookieConsent from '../../src/components/CookieConsent.jsx'
import { CONSENT_COOKIE, saveConsent } from '../../src/lib/consent.js'
const fontId = 'mlezi-optional-fonts'
beforeEach(() => {
  saveConsent('declined')
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
  document.getElementById(fontId)?.remove()
  sessionStorage.clear()
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); document.getElementById(fontId)?.remove() })
it('asks before optional fonts, supports decline and lets visitors change their mind', async () => {
  sessionStorage.setItem('mlezi-convex-auth-test', 'essential-session')
  render(<CookieConsent />)
  expect(document.getElementById(fontId)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Decline optional cookies' }))
  expect(document.getElementById(fontId)).toBeNull()
  expect(sessionStorage.getItem('mlezi-convex-auth-test')).toBe('essential-session')
  await userEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  await userEvent.click(screen.getByRole('button', { name: 'Accept optional cookies' }))
  expect(document.getElementById(fontId)).toBeTruthy()
  sessionStorage.setItem('mlezi-search-public', 'optional-filters')
  await userEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  await userEvent.click(screen.getByRole('button', { name: 'Decline optional cookies' }))
  expect(document.getElementById(fontId)).toBeNull()
  expect(sessionStorage.getItem('mlezi-search-public')).toBeNull()
  expect(sessionStorage.getItem('mlezi-convex-auth-test')).toBe('essential-session')
})
it('reopens consent and stops optional requests when a saved cookie expires', async () => {
  saveConsent('accepted')
  render(<CookieConsent />)
  expect(document.getElementById(fontId)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Accept optional cookies' })).toBeNull()
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
  fireEvent.focus(window)
  expect(await screen.findByRole('button', { name: 'Accept optional cookies' })).toBeTruthy()
  expect(document.getElementById(fontId)).toBeNull()
})
it('fails closed with a usable explanation if cookie persistence is blocked', async () => {
  vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {})
  render(<CookieConsent />)
  await userEvent.click(screen.getByRole('button', { name: 'Accept optional cookies' }))
  expect((await screen.findByRole('alert')).textContent).toContain('could not save')
  expect(document.getElementById(fontId)).toBeNull()
  expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeTruthy()
})
