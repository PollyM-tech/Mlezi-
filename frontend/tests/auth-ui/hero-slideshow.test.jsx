import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import HeroSlideshow from '../../src/components/HeroSlideshow.jsx'

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const current = () => decodeURI(document.querySelector('.hero-background-current').getAttribute('src'))

it('advances every ten seconds and wraps through the five distinct backgrounds', () => {
  render(<HeroSlideshow />)
  expect(current()).toContain('bg-image')
  act(() => vi.advanceTimersByTime(9999))
  expect(current()).toContain('bg-image')
  act(() => vi.advanceTimersByTime(1))
  expect(current()).toContain('Warm Family Reading Nook')
  act(() => vi.advanceTimersByTime(40000))
  expect(current()).toContain('bg-image')
})
it('displays no slideshow buttons or image counter', () => {
  const view = render(<HeroSlideshow />)
  expect(screen.queryByRole('button')).toBeNull()
  expect(view.container.querySelector('output')).toBeNull()
})
it('starts automatically even with reduced motion, without needing a play click', () => {
  window.matchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  render(<HeroSlideshow />)
  expect(screen.queryByRole('button', { name: /Play background slideshow/ })).toBeNull()
  act(() => vi.advanceTimersByTime(10000))
  expect(current()).toContain('Warm Family Reading Nook')
})
it('stops rotation in a hidden tab and clears timers on unmount', () => {
  const view = render(<HeroSlideshow />)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(30000))
  expect(current()).toContain('bg-image')
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(10000))
  expect(current()).toContain('Warm Family Reading Nook')
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
