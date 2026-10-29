import Landing from './Landing.jsx'
import LegalPage from './LegalPage.jsx'
import { PUBLIC_PAGES } from '../lib/public-pages.js'
import logo from '../assets/logo.png'

export default function PublicPages({ page }) {
  if (page?.path === '/') return <Landing />
  if (page?.type) return <LegalPage type={page.type} />
  return <div className="landing"><header className="site-header landing-header"><a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi" /></a><nav aria-label="Main navigation"><a href="/east-africa/">East Africa</a> · <a href="/app/#/signin">Log in</a></nav></header>
    <main className="landing-section landing-container regional-page"><a href="/">Mlezi home</a><span className="landing-kicker">FAMILY CARE · EAST AFRICA</span><h1>{page?.heading || 'This page could not be found.'}</h1><p className="landing-section-intro">{page?.intro || 'Return to Mlezi to explore care or sign in to your account.'}</p>
      {page?.sections?.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
      <div className="landing-hero-actions"><a className="button primary" href="/app/#/browse">Explore caregivers</a><a className="button secondary" href="/app/#/join?role=caregiver">Join as a caregiver</a></div>
      <nav className="regional-links" aria-label="Regional care guides">{PUBLIC_PAGES.filter(p => p.sections).map(p => <a key={p.path} href={p.path} aria-current={page?.path === p.path ? 'page' : undefined}>{p.path === '/east-africa/' ? 'East Africa' : p.path.slice(1, -1).replace(/^./, c => c.toUpperCase())}</a>)}</nav>
    </main><footer className="landing-footer landing-container"><p>Mlezi connects families and adult caregivers. Availability depends on actual listings.</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/cookies/">Cookies</a><a href="/terms/">Terms</a></nav></footer></div>
}
