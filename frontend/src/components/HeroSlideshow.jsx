import { useEffect, useState } from 'react'
import careBackground from '../assets/bg-image.png'
import reading from '../assets/Warm Family Reading Nook.png'
import playtime from '../assets/Caring Playtime with Colorful Blocks.png'
import building from '../assets/Joyful Block-Building with Mlezi Caregiver.png'
import caring from '../assets/Warm Mlezi Healthcare Bond.png'

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
