import { useEffect, useState } from 'react'
import careBackground from '../assets/marketing/bg-image.webp'
import reading from '../assets/marketing/warm-family-reading-nook.webp'
import playtime from '../assets/marketing/caring-playtime-with-colorful-blocks.webp'
import building from '../assets/marketing/joyful-block-building-with-mlezi-caregiver.webp'
import caring from '../assets/marketing/warm-mlezi-healthcare-bond.webp'

const slides = [careBackground, reading, playtime, building, caring]
const INTERVAL = 30000

export default function HeroSlideshow() {
  const [staticImage] = useState(() => typeof navigator !== 'undefined' && (navigator.connection?.saveData || /(^|-)2g$|3g/.test(navigator.connection?.effectiveType || '')) || typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [slide, setSlide] = useState({ index: 0, previous: 0 })
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const changed = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])
  useEffect(() => {
    if (hidden || staticImage) return
    const timer = setInterval(() => setSlide(current => ({ previous: current.index, index: (current.index + 1) % slides.length })), INTERVAL)
    return () => clearInterval(timer)
  }, [hidden, staticImage])
  useEffect(() => {
    if (hidden || staticImage) return
    const timer = setTimeout(() => { const image = new Image(); image.src = slides[(slide.index + 1) % slides.length] }, 1500)
    return () => clearTimeout(timer)
  }, [hidden, slide.index, staticImage])
  return <div className="hero-slideshow"><div className="hero-slideshow-images" aria-hidden="true">{slide.previous !== slide.index && <img className="hero-background-image" src={slides[slide.previous]} alt="" decoding="async" />}<img key={slide.index} className="hero-background-image hero-background-current" src={slides[slide.index]} alt="" fetchPriority={slide.index === 0 ? 'high' : 'auto'} decoding="async" /><div className="hero-background-shade" /></div></div>
}
