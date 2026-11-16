import { testimonials } from '../content/testimonials.js'

export default function Testimonials() {
  const approved = testimonials.filter(item => item.publish === true && item.name?.trim() && item.quote?.trim())
  if (!approved.length) return null
  return <section className="landing-section landing-container" aria-labelledby="testimonials-title"><div className="landing-centered"><span className="eyebrow">VOICES FROM OUR COMMUNITY</span><h2 id="testimonials-title">Care brings us together.</h2></div><div className="landing-testimonials">{approved.map(item => <figure key={item.id}><blockquote><p>“{item.quote}”</p></blockquote><figcaption><strong>{item.name}</strong><span>{item.role}{item.location ? ` · ${item.location}` : ''}</span></figcaption></figure>)}</div></section>
}
