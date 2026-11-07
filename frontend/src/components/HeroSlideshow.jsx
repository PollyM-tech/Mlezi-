import { useEffect, useState } from 'react'
import careBackground from '../assets/marketing/bg-image.webp'
import reading from '../assets/marketing/Warm Family Reading Nook.webp'
import playtime from '../assets/marketing/Caring Playtime with Colorful Blocks.webp'
import building from '../assets/marketing/Joyful Block-Building with Mlezi Caregiver.webp'
import caring from '../assets/marketing/Warm Mlezi Healthcare Bond.webp'

const slides = [careBackground, reading, playtime, building, caring]
const INTERVAL = 30000

export default function HeroSlideshow() {
  const [slide, setSlide] = useState({ index: 0, previous: 0 })
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const changed = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])
  useEffect(() => {
    if (hidden) return
    const timer = setInterval(() => setSlide(current => ({ previous: current.index, index: (current.index + 1) % slides.length })), INTERVAL)
    return () => clearInterval(timer)
  }, [hidden])
  useEffect(() => {
    if (hidden) return
    const timer = setTimeout(() => { const image = new Image(); image.src = slides[(slide.index + 1) % slides.length] }, 1500)
    return () => clearTimeout(timer)
  }, [hidden, slide.index])
  return <div className="hero-slideshow"><div className="hero-slideshow-images" aria-hidden="true"><img className="hero-background-image" src={slides[slide.previous]} alt="" decoding="async" /><img key={slide.index} className="hero-background-image hero-background-current" src={slides[slide.index]} alt="" fetchPriority={slide.index === 0 ? 'high' : 'auto'} decoding="async" /><div className="hero-background-shade" /></div></div>
}
