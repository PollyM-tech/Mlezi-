import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Turnstile from '../../src/components/Turnstile.jsx'

beforeEach(() => { vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'fixture-public-key') })
afterEach(() => { cleanup(); document.getElementById('mlezi-turnstile')?.remove(); delete window.turnstile; vi.unstubAllEnvs() })

it('clears expired tokens and recovers from a widget error without losing form details', () => {
  const onToken = vi.fn(), options = []
  window.turnstile = { render: vi.fn((element, config) => { options.push(config); return options.length }), remove: vi.fn() }
  const { unmount } = render(<Turnstile onToken={onToken} reset={0} />)
  expect(options[0]).toMatchObject({ action: 'support', sitekey: 'fixture-public-key', size: 'compact' })
  const invoke = callback => act(callback)
  invoke(() => options[0].callback('valid-token'))
  expect(onToken).toHaveBeenLastCalledWith('valid-token')
  invoke(options[0]['expired-callback'])
  expect(onToken).toHaveBeenLastCalledWith('')
  invoke(options[0]['error-callback'])
  expect(screen.getByRole('alert')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Retry spam-protection check' }))
  expect(window.turnstile.remove).toHaveBeenCalledWith(1)
  expect(options).toHaveLength(2)
  invoke(options[1].callback.bind(null, 'new-token'))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(onToken).toHaveBeenLastCalledWith('new-token')
  invoke(options[1]['timeout-callback'])
  expect(onToken).toHaveBeenLastCalledWith('')
  unmount()
  onToken.mockClear()
  options[1].callback('stale-token')
  expect(onToken).not.toHaveBeenCalled()
})

it('replaces a failed script when retrying instead of waiting on a script that will never load', () => {
  render(<Turnstile onToken={vi.fn()} reset={0} />)
  const first = document.getElementById('mlezi-turnstile')
  fireEvent.error(first)
  fireEvent.click(screen.getByRole('button', { name: 'Retry spam-protection check' }))
  const second = document.getElementById('mlezi-turnstile')
  expect(second).not.toBe(first)
  window.turnstile = { render: vi.fn(() => 1), remove: vi.fn() }
  fireEvent.load(second)
  expect(window.turnstile.render).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).toBeNull()
})
