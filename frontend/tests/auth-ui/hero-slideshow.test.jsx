import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import HeroSlideshow from '../../src/components/HeroSlideshow.jsx'
afterEach(cleanup)
it('retains the approved reading illustration with no generated-photo rotation or controls', () => {
 const {container}=render(<HeroSlideshow />)
 const images=container.querySelectorAll('img')
 expect(images).toHaveLength(1)
 expect(decodeURI(images[0].getAttribute('src'))).toContain('Warm Family Reading Nook')
 expect(screen.queryByRole('button')).toBeNull()
 expect(container.querySelector('output')).toBeNull()
})
