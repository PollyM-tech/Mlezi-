import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import HeroSlideshow from '../../src/components/HeroSlideshow.jsx'
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(document,'hidden','get').mockReturnValue(false)})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
const current=()=>decodeURI(document.querySelector('.hero-background-current').getAttribute('src'))
it('automatically changes every 30 seconds and wraps through all five backgrounds',()=>{
 render(<HeroSlideshow/> )
 expect(current()).toContain('bg-image')
 act(()=>vi.advanceTimersByTime(29999));expect(current()).toContain('bg-image')
 act(()=>vi.advanceTimersByTime(1));expect(current()).toContain('warm-family-reading-nook')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('caring-playtime')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('joyful-block-building')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('warm-mlezi-healthcare-bond')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('bg-image')
 expect(screen.queryByRole('button')).toBeNull()
})
it('suspends work in hidden tabs and clears timers on unmount',()=>{
 const view=render(<HeroSlideshow/> )
 vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'))
 act(()=>vi.advanceTimersByTime(60000));expect(current()).toContain('bg-image')
 vi.spyOn(document,'hidden','get').mockReturnValue(false);fireEvent(document,new Event('visibilitychange'))
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('warm-family-reading-nook')
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})

it('renders the initial hero once and avoids background downloads in data-saving mode', () => {
 vi.stubGlobal('navigator', { connection: { saveData: true, effectiveType: '3g' } })
 const view = render(<HeroSlideshow />)
 expect(view.container.querySelectorAll('img')).toHaveLength(1)
 expect(vi.getTimerCount()).toBe(0)
 act(() => vi.advanceTimersByTime(60000))
 expect(current()).toContain('bg-image')
 view.unmount()
 vi.unstubAllGlobals()
})
