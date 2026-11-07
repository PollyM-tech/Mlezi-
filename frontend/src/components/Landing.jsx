import { navigateApp } from '../lib/routes.js'
import { useState } from 'react'
import logo from '../assets/logo.png'
import travelNanny from '../assets/marketing/travelnanny.webp'
import playground from '../assets/marketing/Joyful Family Day at the Playground.webp'
import blockBuilding from '../assets/marketing/Joyful Block-Building with Mlezi Caregiver.webp'
import homeCare from '../assets/marketing/Warm Living Room Caregiver Cleaning.webp'
import nannyPlay from '../assets/marketing/bg-image.webp'
import Partners from './Partners.jsx'
import HeroSlideshow from './HeroSlideshow.jsx'
import { FAQ_ENTRIES } from '../lib/faq.js'

function Icon({ name, ...props }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    bag: <><rect x="4" y="7" width="16" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M4 12h16M10 12v3h4v-3"/></>,
    book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/></>,
    sprout: <><path d="M12 22V11M12 15C3 16 2 10 2 6c7-1 11 3 10 9Zm0-4C11 3 16 2 22 2c1 7-4 10-10 9Z"/></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.heart}</svg>
}

const careTypes = [
  { name: 'Nannies & babysitters', detail: 'Everyday childcare', category: 'nanny' },
  { name: 'Newborn & maternity', detail: 'Support for your baby’s first months', category: 'newborn_maternity_nanny' },
  { name: 'Overnight care', detail: 'Night care & sleep routines', service: 'overnight' },
  { name: 'Early-years educators', detail: 'Learning through play', category: 'early_years_educator' },
  { name: 'Travel nannies', detail: 'Childcare on trips & holidays', category: 'travel_nanny' },
  { name: 'Special needs nannies', detail: 'Support for your child’s needs', category: 'special_needs_nanny' },
]
const questions = FAQ_ENTRIES.filter(entry => entry.featured).map(entry => [entry.question, entry.answer])

export default function Landing({ user, onSignOut, checkingSession = false }) {
  const caregiver = user?.role === 'caregiver'
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [arrangement, setArrangement] = useState('')
  function scrollTo(id) {
    setMenuOpen(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  function findCare(event) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (arrangement) params.set('service_type', arrangement)
    navigateApp(`/caregivers${params.size ? `?${params}` : ''}`)
  }
  return <div className="landing">
    <header className="site-header landing-header">
      <a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi — a little care, a brighter beginning" /></a>
      <button className="landing-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close ×' : 'Menu ☰'}</button>
      <nav id="landing-navigation" className={`landing-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <button onClick={() => scrollTo('how-mlezi-works')}>How it works</button>
        {caregiver ? <a href="/jobs">Find jobs</a> : <button onClick={() => scrollTo('care-categories')}>Browse caregivers</button>}
        <button onClick={() => scrollTo('for-caregivers')}>For caregivers</button>
        <button onClick={() => scrollTo('mlezi-questions')}>FAQs</button>
        {checkingSession ? <span role="status">Checking account…</span> : user ? <><a className="button primary" href={user.role === 'admin' ? '/admin-mlezicareaccess' : '/workspace'}>My workspace <Icon name="arrow" width="17" /></a>{onSignOut && <button type="button" className="landing-signin" onClick={() => onSignOut()}>Sign out</button>}</> : <><a className="landing-signin" href="/signin">Log in</a><a className="button primary" href="/employer">Find care <Icon name="arrow" width="17" /></a></>}
      </nav>
    </header>
    <section className="landing-hero">
      <HeroSlideshow />
      <div className="landing-hero-content landing-container">
      <div className="landing-hero-copy">
        <span className="landing-kicker"><span /> CONNECTING FAMILIES & CAREGIVERS IN KENYA</span>
        <h1>{caregiver ? <>Find families who<br />need <em>your care.</em></> : <>Find a nanny or<br />babysitter <em>in Kenya.</em></>}</h1>
        <p>{caregiver ? 'Create a free profile, share your experience and availability, and explore care jobs that fit your skills.' : 'Compare caregivers by experience, location and expected pay. Meet someone who fits your family and your routine.'}</p>
        <div className="landing-hero-actions"><a className="button primary" href={caregiver ? '/jobs' : '/caregivers'}>{caregiver ? 'Find jobs' : 'Browse caregivers'} <Icon name="arrow" width="18" /></a><a className="button secondary" href={caregiver ? '/workspace' : '/caregiver'}>{caregiver ? 'Manage my profile' : 'Find work as a caregiver'}</a></div>
        <p className="landing-start-note">{caregiver ? 'Your basic profile is free. Premium visibility is optional.' : 'Free to browse.'}</p>
        <ol className="landing-quick-steps" aria-label={caregiver ? 'How to find care work' : 'How to find care'}>
          {(caregiver ? ['Create your profile', 'Explore care jobs', 'Agree work with families'] : ['Browse & compare', 'Unlock contacts', 'Interview & hire directly']).map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
        <p className="landing-marketplace-note">{caregiver ? 'Families contact and hire caregivers directly through Mlezi.' : 'You choose who to hire and agree duties and pay directly. Contact-access payments require administrator confirmation.'}</p>
      </div>
      </div>
    </section>
    {!caregiver && <><section className="landing-search-wrap landing-container" aria-labelledby="landing-search-title"><form className="landing-search" onSubmit={findCare}><div><span className="eyebrow">START YOUR SEARCH</span><h2 id="landing-search-title">What care do you need?</h2></div><label>I’m looking for<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Select care type</option><option value="nanny">A nanny</option><option value="babysitter">A babysitter</option><option value="newborn_maternity_nanny">Newborn & maternity care</option><option value="early_years_educator">An early-years educator</option><option value="special_needs_nanny">A special needs nanny</option><option value="travel_nanny">A travel nanny</option><option value="occasional_babysitter">On-call / occasional care</option></select></label><label>Work arrangement<select value={arrangement} onChange={e => setArrangement(e.target.value)}><option value="">Select work arrangement</option><option value="live_in">Live-in</option><option value="live_out">Live-out / day nanny</option><option value="overnight">Overnight</option><option value="travel">Travel & holidays</option><option value="occasional_backup">On-call / occasional</option></select></label><button className="button primary">Search caregivers <Icon name="arrow" width="18" /></button></form></section>
    <section id="care-categories" className="landing-section landing-container"><div className="landing-section-heading"><div><span className="eyebrow">EVERY FAMILY IS DIFFERENT</span><h2>Choose the care your family needs.</h2></div><a className="landing-link" href="/caregivers">Explore all caregivers <span>↗</span></a></div><p className="landing-section-intro">From first cuddles to first school days, family trips, or a few hours while you work or cook — find care for the moment you’re in.</p><div className="landing-care-grid">{careTypes.map(type => <a key={type.category || type.service} className="landing-care-type" href={type.service ? `/caregivers?service_type=${type.service}` : `/caregivers?category=${type.category}`}><h3>{type.name}</h3><p>{type.detail}</p></a>)}</div></section>
    </>}
    <section id="how-mlezi-works" className="landing-how"><div className="landing-container"><div className="landing-section-heading"><div><span className="eyebrow">LESS SEARCHING. MORE CONNECTION.</span><h2>From searching to hiring, in three steps.</h2></div><p>Browse for free. Choose paid contact access<br />when you’re ready to speak to a caregiver.</p></div><div className="landing-steps"><article><span className="landing-step-number">01 <span /></span><h3>Search for the care you need</h3><p>Choose the care you need. Filter by experience, work arrangement, availability, and budget.</p></article><article><span className="landing-step-number">02 <span /></span><h3>Compare profiles & shortlist</h3><p>Explore profiles, read employer reviews, and privately save the caregivers you’d like to meet.</p></article><article><span className="landing-step-number">03 <span /></span><h3>Unlock contacts & arrange an interview</h3><p>With a contact-access pass, unlock contact details. Interview, check references, and agree the care together.</p></article></div><a className="button primary" href={caregiver ? "/jobs" : "/caregivers"}>{caregiver ? "Explore jobs" : "Start exploring"} <Icon name="arrow" width="18" /></a></div></section>
    <section className="landing-section landing-container"><div className="landing-section-heading"><div><span className="eyebrow">CARE THAT FITS YOUR DAY</span><h2>At home, at work, or away together.</h2></div></div><div className="landing-steps landing-care-stories"><article><img className="landing-story-image" src={travelNanny} alt="A nanny helping children build sandcastles on a family beach holiday" width="1672" height="941" loading="lazy" decoding="async" /><h3>Travel with a little help</h3><p>Find nannies offering childcare on family trips and holidays. Discuss destinations, working hours, travel costs and accommodation together.</p><a className="landing-link" href={caregiver ? "/jobs" : "/caregivers?category=travel_nanny"}>{caregiver ? "Explore care jobs" : "Find a travel nanny ↗"}</a></article><article><img className="landing-story-image" src={homeCare} alt="A caregiver tidying a warm family living room" width="1672" height="941" loading="lazy" decoding="async" /><h3>Everyday help at home</h3><p>Find nannies to help with children while you work, cook or manage your day. Discuss any household help, hours and duties together.</p><a className="landing-link" href={caregiver ? "/jobs" : "/caregivers?category=nanny"}>{caregiver ? "Explore care jobs" : "Find a nanny ↗"}</a></article><article><img className="landing-story-image" src={playground} alt="A caregiver supporting children at the playground while their parents relax nearby" width="1672" height="941" loading="lazy" decoding="async" /><h3>On-call when you need care</h3><p>Explore occasional care for evenings, events and other one-off arrangements.</p><a className="landing-link" href={caregiver ? "/jobs" : "/caregivers?service_type=occasional_backup"}>{caregiver ? "Explore care jobs" : "Find an on-call nanny ↗"}</a></article></div></section>
    <section className="landing-section landing-container landing-play-feature" aria-labelledby="learning-through-play"><img src={blockBuilding} alt="A caregiver and three children building with colourful wooden blocks" width="1774" height="887" loading="lazy" decoding="async" /><div><span className="eyebrow">LITTLE MOMENTS. GROWING MINDS.</span><h2 id="learning-through-play">Room to play.<br />Space to discover.</h2><p>From building blocks to imaginative games, everyday play can become a moment of connection. Find caregivers who enjoy helping little ones explore, learn and grow.</p><a className="landing-link" href={caregiver ? "/jobs" : "/caregivers?category=early_years_educator"}>{caregiver ? "Explore care jobs" : "Explore early-years care"}<span>↗</span></a></div></section>

    <section className="landing-section landing-container landing-trust"><div><span className="eyebrow">CLEAR SIGNALS. THOUGHTFUL CHOICES.</span><h2>Get to know the person<br />behind the profile.</h2><p>Choosing care is personal. Mlezi helps you explore experience and feedback, while keeping identity checks, paid visibility, and reputation distinct.</p><a className="landing-link" href={caregiver ? "/workspace" : "/caregivers"}>{caregiver ? "View my profile" : "Meet the caregivers"}</a></div><div className="landing-trust-signals"><article><div><h3>Identity checked</h3><p>A specific identity review, not a background-check guarantee.</p></div></article><article><div><h3>Public employer reviews</h3><p>Ratings and experiences shared by employers who unlocked a contact.</p></div></article><article><div><h3>Premium, clearly labelled</h3><p>Paid priority among matching profiles. It does not buy verification or better ratings.</p></div></article></div></section>
    <section id="for-caregivers" className="landing-caregiver-wrap landing-container"><div className="landing-caregiver landing-caregiver-with-photo"><img className="landing-caregiver-photo" src={nannyPlay} alt="A nanny and a young child enjoying playtime together" width="1672" height="941" loading="lazy" decoding="async" /><div><span className="eyebrow">FOR THE PEOPLE WHO CARE</span><h2>Your experience matters.<br />Let families find you.</h2><p>You bring patience, skill, and heart to your work. Give your experience a home with a free Mlezi caregiver profile.</p><div className="caregiver-benefits"><span><Icon name="check" width="17" /> Free basic profile</span><span><Icon name="check" width="17" /> Your availability & expected pay</span><span><Icon name="check" width="17" /> Optional Premium visibility</span></div><a className="button light" href="/caregiver">Create my caregiver profile <Icon name="arrow" width="18" /></a></div></div></section>
    <section className="landing-section landing-container" id="mlezi-plans"><div className="landing-centered"><span className="eyebrow">SIMPLE PLANS. CLEAR CHOICES.</span><h2>Start with a little exploration.</h2><p>Browse and create a basic profile for free. Choose paid access when you need more.</p></div><div className="landing-plans landing-plans-pair"><article><span className="eyebrow">FOR FAMILIES</span><h3>Find your fit</h3><div className="landing-price">Free <span>to browse & shortlist</span></div><p>Explore caregiver profiles, compare experience, and save your favourites privately.</p><a className="landing-link" href={caregiver ? "/jobs" : "/caregivers"}>{caregiver ? "Find jobs" : "Browse caregivers"} <span>↗</span></a></article><article><span className="eyebrow">EMPLOYER CONTACT ACCESS</span><h3>Make the connection</h3><div className="landing-price">KES 300 <span>/ 30 days</span></div><p>Or KES 500 for 90 days. Previously unlocked contacts stay accessible after expiry.</p><a className="landing-link" href="/caregiver">Start with a free profile <span>↗</span></a></article></div></section>
    <section id="mlezi-questions" className="landing-faq landing-container"><div><span className="eyebrow">A FEW THINGS TO KNOW</span><h2>Good questions.<br />Clear answers.</h2><p>A little clarity before you begin.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="landing-section landing-container"><span className="eyebrow">ROOTED IN KENYA. CONNECTED ACROSS EAST AFRICA.</span><h2>Care begins with understanding.</h2><p className="landing-section-intro">Looking for a nanny, househelp or maid? Start with the duties your family needs. Mlezi currently focuses on childcare; agree any household tasks directly with the caregiver.</p><nav className="regional-links" aria-label="Regional care guides"><a href="/kenya/">Care in Kenya</a><a href="/uganda/">Joining from Uganda</a><a href="/burundi/">Joining from Burundi</a><a href="/rwanda/">Joining from Rwanda</a><a href="/east-africa/">East Africa guide</a></nav></section><section className="landing-final"><div className="landing-container"><span className="eyebrow">CARE BEGINS WITH PEOPLE</span><h2>Find your next<br /><em>brighter beginning.</em></h2><div className="landing-final-actions"><a className="button primary" href={caregiver ? "/jobs" : "/caregivers"}>{caregiver ? "Find jobs" : "I’m looking for care"} <Icon name="arrow" width="18" /></a><a className="button secondary" href={caregiver ? "/workspace" : "/caregiver"}>{caregiver ? "My profile" : "I’m a caregiver"} <Icon name="arrow" width="18" /></a></div></div></section>
    <Partners />
    <footer className="landing-footer landing-container">
      <div className="landing-footer-brand"><a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi" /></a><p>A little care. A brighter beginning.</p><small>Connecting families and caregivers in Kenya.</small></div>
      <nav className="landing-footer-links" aria-label="Footer navigation">
        <div><h3>Explore Mlezi</h3><a href={caregiver ? "/jobs" : "/caregivers"}>{caregiver ? "Find jobs" : "Find a caregiver"}</a><a href="/caregiver">Join as a caregiver</a><button type="button" onClick={() => scrollTo('how-mlezi-works')}>How it works</button></div>
        <div><h3>Help &amp; community</h3><a href="/support/">Support</a><button type="button" onClick={() => scrollTo('mlezi-questions')}>FAQs</button><a href="#sponsors-partners">Sponsors &amp; Partners</a></div>
        <div><h3>Legal</h3><a href="/privacy/">Privacy notice</a><a href="/terms/">Terms of use</a><a href="/cookies/">Cookie policy</a></div>
      </nav>
      <div className="landing-footer-bottom"><p>Mlezi is a caregiver marketplace, not a recruitment agency. Families hire and pay caregivers directly.</p><p>© {new Date().getFullYear()} Mlezi. Made with care.</p></div>
    </footer>
  </div>
}
