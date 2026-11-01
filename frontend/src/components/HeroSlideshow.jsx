import reading from '../assets/Warm Family Reading Nook.png'

// Retain the approved reading illustration until consented real photography is
// available. Do not present generated portraits as photographs of real families.
export default function HeroSlideshow() {
  return <div className="hero-slideshow"><div className="hero-slideshow-images" aria-hidden="true"><img className="hero-background-image hero-background-current" src={reading} alt="" fetchPriority="high" decoding="async" /><div className="hero-background-shade" /></div></div>
}
