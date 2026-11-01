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
 act(()=>vi.advanceTimersByTime(1));expect(current()).toContain('Warm Family Reading Nook')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('Caring Playtime')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('Joyful Block-Building')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('Warm Mlezi Healthcare Bond')
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('bg-image')
 expect(screen.queryByRole('button')).toBeNull()
})
it('suspends work in hidden tabs and clears timers on unmount',()=>{
 const view=render(<HeroSlideshow/> )
 vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'))
 act(()=>vi.advanceTimersByTime(60000));expect(current()).toContain('bg-image')
 vi.spyOn(document,'hidden','get').mockReturnValue(false);fireEvent(document,new Event('visibilitychange'))
 act(()=>vi.advanceTimersByTime(30000));expect(current()).toContain('Warm Family Reading Nook')
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})
