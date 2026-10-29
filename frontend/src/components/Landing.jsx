import { useState } from 'react'
import logo from '../assets/logo.png'

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

// Original vector artwork: decorative illustration, not a real caregiver profile.
function CareIllustration() {
  return <svg viewBox="0 0 560 590" role="img" aria-labelledby="care-art-title" className="care-illustration">
    <title id="care-art-title">Illustration of a caregiver and child building colourful blocks together</title>
    <defs><linearGradient id="room" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2e6cf"/><stop offset="1" stopColor="#d7d8bb"/></linearGradient><pattern id="rug" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11h22M11 0v22" stroke="#c5b598" strokeWidth=".7" opacity=".5"/></pattern></defs>
    <rect x="20" y="15" width="520" height="560" rx="240" fill="#305e48"/>
    <path d="M65 480V260a215 215 0 0 1 430 0v220Z" fill="url(#room)"/>
    <path d="M101 319V161a75 75 0 0 1 150 0v158Z" fill="#f9f5e8"/>
    <path d="M113 305V165a63 63 0 0 1 126 0v140Z" fill="#bfd0bb"/>
    <path d="M175 103v202m-62-90h126" stroke="#f9f5e8" strokeWidth="8"/>
    <path d="M114 274q52-55 125-37v68H114" fill="#88a68a"/>
    <path d="M175 267q33-39 64-41v79h-64" fill="#a7b79c"/>
    <circle cx="214" cy="165" r="18" fill="#e4ca86"/>
    <path d="M355 124h75v92h-75z" fill="#ece2c9" stroke="#b7ab88" strokeWidth="5"/>
    <path d="M393 199v-53m0 31q-31-9-23-27 26 0 23 27m0-7q23-24 29-9-5 20-29 24" stroke="#6f8d68" strokeWidth="4" fill="none"/>
    <path d="M55 433q225-70 450 0v77q-225 86-450-1Z" fill="#d2c19e"/>
    <ellipse cx="285" cy="461" rx="197" ry="67" fill="#efe3ca"/>
    <ellipse cx="285" cy="461" rx="197" ry="67" fill="url(#rug)"/>
    <path d="M436 351q-30-50-12-90 36 13 24 64 3-70 34-83 23 48-20 95 42-36 55-9-18 32-62 37" fill="#6e8a58"/>
    <path d="m427 351 13 61h37l13-61" fill="#b57e55"/>
    <path d="M160 401q-10-66 18-113l77-8q40 33 47 113l-43 36Z" fill="#cc9a55"/>
    <path d="M186 282v-35h48v35q-24 24-48 0" fill="#885334"/>
    <ellipse cx="209" cy="223" rx="40" ry="48" fill="#9c6441"/>
    <path d="M170 234q-15-69 26-75 52-12 57 38l-20-7q-31 13-56 7l-1 36Z" fill="#293c31"/>
    <circle cx="183" cy="164" r="28" fill="#293c31"/>
    <path d="m205 237 8 4 9-5" fill="none" stroke="#5f3424" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M221 220h1m-24-1h1" stroke="#382c24" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="176" cy="231" r="5" fill="#d1a85e"/>
    <path d="M176 329q-19 33-5 59l72 49 17-20-53-49 8-26" fill="#9c6441"/>
    <path d="M249 312q35 37 52 68l36 26-12 20-51-22q-31-36-44-51" fill="#9c6441"/>
    <path d="M154 402q-19 34 22 59l90 17 65-10q5-22-14-27l-67-5-38-36" fill="#31533e"/>
    <path d="m260 470 62 5q28-1 26-13-3-18-34-17" fill="#9c6441"/>
    <path d="M327 339q-27 28-25 75l64 10 26-41-23-41" fill="#91a6a0"/>
    <path d="M329 339v-26h31v29" fill="#a16c49"/>
    <ellipse cx="344" cy="295" rx="28" ry="34" fill="#aa7650"/>
    <path d="M316 297q-9-49 22-48 35-6 37 30l-16-8-8 9-24-3Z" fill="#303d31"/>
    <path d="m338 307 7 3 6-4" fill="none" stroke="#633e2a" strokeWidth="2" strokeLinecap="round"/>
    <path d="M335 292h1m17-1h1" stroke="#382c24" strokeWidth="3" strokeLinecap="round"/>
    <path d="m323 356-29 29-24 22 13 17 32-19 27-27" fill="#aa7650"/>
    <path d="M365 361q18 25 13 42l-23 29-18-9 17-27-11-18" fill="#aa7650"/>
    <path d="M307 411q-21 29 1 51l54 9 29-15q-7-22-34-21l-10-15" fill="#bf7756"/>
    <path d="m364 463 31 3q18-7 12-15-10-9-28-2" fill="#aa7650"/>
    <rect x="229" y="443" width="35" height="34" rx="3" fill="#cf8053"/>
    <rect x="265" y="410" width="34" height="67" rx="3" fill="#dfb766"/>
    <path d="m260 410 22-29 22 29" fill="#567c65"/>
    <rect x="306" y="459" width="40" height="22" rx="3" fill="#759798"/>
    <circle cx="189" cy="492" r="12" fill="#dfb766"/>
    <path d="m401 481 14-20 18 20" fill="#be7d53"/>
    <path d="m68 162 8-16 7 16 17 7-17 6-7 17-8-17-16-6Z" fill="#e3c17c"/>
    <path d="m470 114 5-12 5 12 12 5-12 5-5 12-5-12-12-5Z" fill="#dfb766"/>
  </svg>
}

const careTypes = [
  { name: 'Everyday care', detail: 'Nannies & babysitters', category: 'nanny', icon: 'heart', color: 'sage' },
  { name: 'New beginnings', detail: 'Newborn & maternity care', category: 'newborn_maternity_nanny', icon: 'sprout', color: 'sand' },
  { name: 'Restful nights', detail: 'Night care & sleep routines', service: 'overnight', icon: 'moon', color: 'blue' },
  { name: 'Little discoveries', detail: 'Early-years educators', category: 'early_years_educator', icon: 'book', color: 'rose' },
  { name: 'Care on the go', detail: 'Childcare on trips & holidays', category: 'travel_nanny', icon: 'bag', color: 'sand' },
  { name: 'A little extra support', detail: 'Special needs nannies', category: 'special_needs_nanny', icon: 'sun', color: 'sage' },
]
const questions = [
  ['Can I browse before paying?', 'Yes. Browsing, filtering, and shortlisting are free. An employer contact-access pass is needed to unlock new caregiver contacts. Contacts you have already unlocked remain available after your pass expires.'],
  ['What does “Identity checked” mean?', 'It means an identity review has been completed. It is separate from Premium membership and employer ratings. It is not a criminal-background check or a guarantee of future conduct. You should still interview caregivers and check their references.'],
  ['Is a caregiver’s contact information public?', 'No. Public profiles show experience, services, availability, expected pay, and reviews. Contact details are protected behind employer contact access. National ID documents are never part of a public profile.'],
  ['Can I join as a caregiver for free?', 'Yes. Creating an account and a basic caregiver profile is free. You will need a profile photo, national ID image and recent selfie to complete your profile. Yearly Premium membership is optional and buys priority visibility, not verification or a guarantee of work.'],
  ['Does Mlezi employ the caregivers?', 'Mlezi is a marketplace connecting families and caregivers. Families and caregivers discuss the work, pay, references, and care arrangements directly.'],
]

export default function Landing({ user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState('nanny')
  const [arrangement, setArrangement] = useState('')
  function scrollTo(id) {
    setMenuOpen(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  function findCare(event) {
    event.preventDefault()
    const params = new URLSearchParams({ category })
    if (arrangement) params.set('service_type', arrangement)
    window.location.href = `/app/#/browse?${params}`
  }
  return <div className="landing">
    <header className="site-header landing-header">
      <a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi — a little care, a brighter beginning" /></a>
      <button className="landing-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close ×' : 'Menu ☰'}</button>
      <nav id="landing-navigation" className={`landing-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <button onClick={() => scrollTo('how-mlezi-works')}>How it works</button>
        <button onClick={() => scrollTo('care-categories')}>Find your care</button>
        <button onClick={() => scrollTo('for-caregivers')}>For caregivers</button>
        <button onClick={() => scrollTo('mlezi-questions')}>FAQs</button>
        {user ? <a className="button primary" href="/app/#/workspace">My workspace <Icon name="arrow" width="17" /></a> : <><a className="landing-signin" href="/app/#/signin">Log in</a><a className="button primary" href="/app/#/join?role=employer">Get started <Icon name="arrow" width="17" /></a></>}
      </nav>
    </header>
    <section className="landing-hero landing-container">
      <div className="landing-hero-copy"><span className="landing-kicker"><span /> ROOTED IN CARE. MADE FOR KENYA.</span><h1>A little care.<br />A <em>brighter</em>{' '}beginning.</h1><p>For the everyday moments and the big little milestones. Find a caregiver who fits your family, your routine, and your child’s world.</p><div className="landing-hero-actions"><a className="button primary" href="/app/#/browse">Find your caregiver <Icon name="arrow" width="18" /></a><a className="landing-link" href="/app/#/join?role=caregiver">I’m a caregiver <span>↗</span></a></div><div className="landing-reassurance"><span><Icon name="check" width="17" /> Free to browse</span><span><Icon name="check" width="17" /> Your search stays private</span></div></div>
      <div className="landing-hero-art"><div className="hero-art-label"><Icon name="heart" width="18" /><span>Good care starts<br /><strong>with connection.</strong></span></div><CareIllustration /><div className="hero-art-note"><span className="hero-note-mark">✦</span><div><strong>Care for their world.</strong><span>More room for little discoveries.</span></div></div><span className="hero-art-caption">EVERYDAY CARE. EXTRAORDINARY LITTLE MOMENTS.</span></div>
    </section>
    <section className="landing-search-wrap landing-container" aria-labelledby="landing-search-title"><form className="landing-search" onSubmit={findCare}><div><span className="eyebrow">LET’S FIND YOUR FIT</span><h2 id="landing-search-title">What does care look like for you?</h2></div><label>I’m looking for<select value={category} onChange={e => setCategory(e.target.value)}><option value="nanny">A nanny</option><option value="babysitter">A babysitter</option><option value="newborn_maternity_nanny">Newborn & maternity care</option><option value="early_years_educator">An early-years educator</option><option value="special_needs_nanny">A special needs nanny</option><option value="travel_nanny">A travel nanny</option><option value="occasional_babysitter">On-call / occasional care</option></select></label><label>Work arrangement<select value={arrangement} onChange={e => setArrangement(e.target.value)}><option value="">Any arrangement</option><option value="live_in">Live-in</option><option value="live_out">Live-out / day nanny</option><option value="overnight">Overnight</option><option value="travel">Travel & holidays</option><option value="occasional_backup">On-call / occasional</option></select></label><button className="button primary">Explore care <Icon name="arrow" width="18" /></button></form></section>
    <section id="care-categories" className="landing-section landing-container"><div className="landing-section-heading"><div><span className="eyebrow">EVERY FAMILY IS DIFFERENT</span><h2>A little help, in all the right ways.</h2></div><a className="landing-link" href="/app/#/browse">Explore all caregivers <span>↗</span></a></div><p className="landing-section-intro">From first cuddles to first school days, family trips, or a few hours while you work or cook — find care for the moment you’re in.</p><div className="landing-care-grid">{careTypes.map(type => <a key={type.category || type.service} className="landing-care-type" href={type.service ? `/app/#/browse?service_type=${type.service}` : `/app/#/browse?category=${type.category}`}><span className={`care-type-icon ${type.color}`}><Icon name={type.icon} /></span><h3>{type.name}</h3><p>{type.detail}</p><span className="care-type-arrow" aria-hidden="true">↗</span></a>)}</div></section>
    <section className="landing-section landing-container"><div className="landing-section-heading"><div><span className="eyebrow">CARE THAT FITS YOUR DAY</span><h2>At home, at work, or away together.</h2></div></div><div className="landing-steps"><article><h3>Travel with a little help</h3><p>Find nannies offering childcare on family trips and holidays. Discuss destinations, working hours, travel costs and accommodation together.</p><a className="landing-link" href="/app/#/browse?category=travel_nanny">Find a travel nanny ↗</a></article><article><h3>Everyday help at home</h3><p>Find nannies to help with children while you work, cook or manage your day. Agree hours and duties together.</p><a className="landing-link" href="/app/#/browse?category=nanny">Find a nanny ↗</a></article><article><h3>On-call when you need care</h3><p>Explore occasional care for evenings, events and other one-off arrangements.</p><a className="landing-link" href="/app/#/browse?service_type=occasional_backup">Find an on-call nanny ↗</a></article></div></section>
    <section id="how-mlezi-works" className="landing-how"><div className="landing-container"><div className="landing-section-heading"><div><span className="eyebrow">LESS SEARCHING. MORE CONNECTION.</span><h2>Your next chapter starts here.</h2></div><p>A simpler way to meet the people<br />who could become part of your everyday.</p></div><div className="landing-steps"><article><span className="landing-step-number">01 <span /></span><h3>Tell us what fits</h3><p>Choose the care you need. Filter by experience, work arrangement, availability, and budget.</p></article><article><span className="landing-step-number">02 <span /></span><h3>Get to know your options</h3><p>Explore profiles, read employer reviews, and privately save the caregivers you’d like to meet.</p></article><article><span className="landing-step-number">03 <span /></span><h3>Start a conversation</h3><p>With a contact-access pass, unlock contact details. Interview, check references, and agree the care together.</p></article></div><a className="button primary" href="/app/#/browse">Start exploring <Icon name="arrow" width="18" /></a></div></section>
    <section className="landing-section landing-container landing-trust"><div><span className="eyebrow">CLEAR SIGNALS. THOUGHTFUL CHOICES.</span><h2>Get to know the person<br />behind the profile.</h2><p>Choosing care is personal. Mlezi helps you explore experience and feedback, while keeping identity checks, paid visibility, and reputation distinct.</p><a className="landing-link" href="/app/#/browse">Meet the caregivers <span>↗</span></a></div><div className="landing-trust-signals"><article><span className="trust-symbol"><Icon name="check" /></span><div><h3>Identity checked</h3><p>A specific identity review, not a background-check guarantee.</p></div></article><article><span className="trust-symbol">☆</span><div><h3>Public employer reviews</h3><p>Ratings and experiences shared by employers who unlocked a contact.</p></div></article><article><span className="trust-symbol">✦</span><div><h3>Premium, clearly labelled</h3><p>Paid priority among matching profiles. It does not buy verification or better ratings.</p></div></article></div></section>
    <section id="for-caregivers" className="landing-caregiver-wrap landing-container"><div className="landing-caregiver"><div className="caregiver-flower" aria-hidden="true"><svg viewBox="0 0 250 250"><g fill="#d8b575"><ellipse cx="125" cy="68" rx="28" ry="55"/><ellipse cx="125" cy="182" rx="28" ry="55"/><ellipse cx="68" cy="125" rx="55" ry="28"/><ellipse cx="182" cy="125" rx="55" ry="28"/><ellipse cx="125" cy="125" rx="27" ry="85" transform="rotate(45 125 125)"/><ellipse cx="125" cy="125" rx="27" ry="85" transform="rotate(-45 125 125)"/></g><circle cx="125" cy="125" r="33" fill="#2d5844"/><path d="M111 123q14 20 28 0" fill="none" stroke="#e8d6b4" strokeWidth="3" strokeLinecap="round"/></svg><span>MADE OF CARE.</span></div><div><span className="eyebrow">FOR THE PEOPLE WHO CARE</span><h2>Your experience matters.<br />Let families find you.</h2><p>You bring patience, skill, and heart to your work. Give your experience a home with a free Mlezi caregiver profile.</p><div className="caregiver-benefits"><span><Icon name="check" width="17" /> Free basic profile</span><span><Icon name="check" width="17" /> Your availability & expected pay</span><span><Icon name="check" width="17" /> Optional Premium visibility</span></div><a className="button light" href="/app/#/join?role=caregiver">Create my caregiver profile <Icon name="arrow" width="18" /></a></div></div></section>
    <section className="landing-section landing-container" id="mlezi-plans"><div className="landing-centered"><span className="eyebrow">SIMPLE PLANS. CLEAR CHOICES.</span><h2>Start with a little exploration.</h2><p>Browse and create a basic profile for free. Choose paid access when you need more.</p></div><div className="landing-plans"><article><span className="eyebrow">FOR FAMILIES</span><h3>Find your fit</h3><div className="landing-price">Free <span>to browse & shortlist</span></div><p>Explore caregiver profiles, compare experience, and save your favourites privately.</p><a className="landing-link" href="/app/#/browse">Browse caregivers <span>↗</span></a></article><article><span className="eyebrow">EMPLOYER CONTACT ACCESS</span><h3>Make the connection</h3><div className="landing-price">KES 300 <span>/ 30 days</span></div><p>Or KES 500 for 90 days. Previously unlocked contacts stay accessible after expiry.</p><span className="landing-plan-status">Payments coming soon</span></article><article><span className="eyebrow">FOR CAREGIVERS</span><h3>A little more visibility</h3><div className="landing-price">KES 500 <span>/ 365 days</span></div><p>Optional Premium placement within matching results. Your basic profile stays free.</p><a className="landing-link" href="/app/#/join?role=caregiver">Start with a free profile <span>↗</span></a></article></div><p className="landing-pricing-note">Payments are being set up. Browsing, account creation, and free profiles are available now.</p></section>
    <section id="mlezi-questions" className="landing-faq landing-container"><div><span className="eyebrow">A FEW THINGS TO KNOW</span><h2>Good questions.<br />Clear answers.</h2><p>A little clarity before you begin.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="landing-section landing-container"><span className="eyebrow">ROOTED IN KENYA. CONNECTED ACROSS EAST AFRICA.</span><h2>Care begins with understanding.</h2><p className="landing-section-intro">Looking for a nanny, househelp or maid? Start with the duties your family needs. Mlezi currently focuses on childcare; agree any household tasks directly with the caregiver.</p><nav className="regional-links" aria-label="Regional care guides"><a href="/kenya/">Care in Kenya</a><a href="/uganda/">Joining from Uganda</a><a href="/burundi/">Joining from Burundi</a><a href="/rwanda/">Joining from Rwanda</a><a href="/east-africa/">East Africa guide</a></nav></section><section className="landing-final"><div className="landing-container"><span className="eyebrow">CARE BEGINS WITH PEOPLE</span><h2>Find your next<br /><em>brighter beginning.</em></h2><div className="landing-final-actions"><a className="button primary" href="/app/#/browse">I’m looking for care <Icon name="arrow" width="18" /></a><a className="button secondary" href="/app/#/join?role=caregiver">I’m a caregiver <Icon name="arrow" width="18" /></a></div></div></section>
    <footer className="landing-footer landing-container"><div><a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi" /></a><p>A little care. A brighter beginning.</p><small>Connecting families and caregivers in Kenya.</small></div><nav aria-label="Footer navigation"><a href="/privacy/">Privacy</a><a href="/cookies/">Cookies</a><a href="/terms/">Terms</a><a href="/app/#/browse">Find a caregiver</a><a href="/app/#/join?role=caregiver">Join as a caregiver</a><button onClick={() => scrollTo('how-mlezi-works')}>How it works</button><button onClick={() => scrollTo('mlezi-questions')}>FAQs</button></nav><p className="landing-footer-note">Mlezi connects people. Families and caregivers make their care arrangements directly.<br />© {new Date().getFullYear()} Mlezi. Made with care.</p></footer>
  </div>
}
