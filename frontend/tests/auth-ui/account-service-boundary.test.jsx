import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import AccountServiceBoundary from '../../src/components/AccountServiceBoundary.jsx'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('keeps signup service failures visible with recovery and support links', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function FailedSignup() { throw new Error('Could not find public function for accounts:authSettings') }
  render(<AccountServiceBoundary><FailedSignup /></AccountServiceBoundary>)
  expect(screen.getByRole('alert').textContent).toContain('account service is temporarily unavailable')
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Return to Mlezi home' }).getAttribute('href')).toBe('/')
  expect(screen.getByRole('link', { name: 'Contact support' }).getAttribute('href')).toBe('/support/')
  expect(screen.queryByText(/Could not find public function/)).toBeNull()
})
