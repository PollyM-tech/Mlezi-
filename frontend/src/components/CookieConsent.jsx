import { useEffect, useRef, useState } from 'react'
import { clearOptionalStorage, getConsent, saveConsent } from '../lib/consent'
import '../cookie-consent.css'

const FONT_ID = 'mlezi-optional-fonts'
const FONT_URL = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap'

export default function CookieConsent() {
  const [choice, setChoice] = useState(getConsent)
  const [open, setOpen] = useState(() => getConsent() === 'unknown')
  const [error, setError] = useState('')
  const settings = useRef(null)
  const heading = useRef(null)
  const openedFromSettings = useRef(false)

  useEffect(() => {
    function sync() { const next = getConsent(); setChoice(next); if (next === 'unknown') setOpen(true) }
    const timer = setInterval(sync, 60000)
    window.addEventListener('mlezi-consent-changed', sync)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(timer)
      window.removeEventListener('mlezi-consent-changed', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  useEffect(() => {
    if (choice === 'accepted') {
      if (!document.getElementById(FONT_ID)) {
        const link = document.createElement('link')
        link.id = FONT_ID; link.rel = 'stylesheet'; link.href = FONT_URL
        document.head.appendChild(link)
      }
    } else {
      document.getElementById(FONT_ID)?.remove()
      clearOptionalStorage()
    }
  }, [choice])

  useEffect(() => {
    if (open && openedFromSettings.current) heading.current?.focus()
    if (!open && openedFromSettings.current) {
      settings.current?.focus()
      openedFromSettings.current = false
    }
  }, [open])

  function choose(value) {
    if (saveConsent(value)) { setError(''); setOpen(false) }
    else setError('Your browser could not save this choice. Optional features are off for this page. Your previous saved preference may return after a reload.')
  }

  return <>
    {!open && <button className="cookie-settings" ref={settings} onClick={() => { openedFromSettings.current = true; setOpen(true); setError('') }} aria-controls="mlezi-cookie-banner">Cookie settings</button>}
    {open && <section className="cookie-banner" id="mlezi-cookie-banner" aria-labelledby="cookie-title" aria-describedby="cookie-summary">
      <div className="cookie-copy"><span className="cookie-eyebrow">YOUR PRIVACY, YOUR CHOICE</span><h2 id="cookie-title" tabIndex="-1" ref={heading}>A little choice about cookies.</h2><p id="cookie-summary">Essential storage supports sign-in and remembers this choice. With your permission, we also remember search filters and load fonts from Google. You can decline optional use and still browse, register, and sign in.</p>
        <details className="cookie-details"><summary>What we use</summary><dl><dt>Essential — always available</dt><dd>Your cookie choice is saved for 180 days. Sign-in uses session storage in your browser tab; it is not an advertising tracker.</dd><dt>Optional — only if you accept</dt><dd>Search preferences are saved in your tab. Fonts load from Google, which receives your IP address and browser request information. Without permission we use local fallback fonts.</dd><dt>No analytics or advertising trackers</dt><dd>Mlezi does not currently use these. Accepting does not authorize unspecified future trackers. Profile photos and normal app requests still load as needed.</dd></dl></details>
        <p><a href="/cookies/">Cookie policy</a> · <a href="/privacy/">Privacy notice</a></p>
        {choice !== 'unknown' && <p className="cookie-current">Current choice: {choice === 'accepted' ? 'optional use accepted' : 'optional use declined'}. You can change it here.</p>}
        {error && <p className="cookie-error" role="alert">{error}</p>}
      </div>
      <div className="cookie-actions"><button className="cookie-choice" onClick={() => choose('declined')}>Decline optional cookies</button><button className="cookie-choice" onClick={() => choose('accepted')}>Accept optional cookies</button>{error && <button className="cookie-close" onClick={() => setOpen(false)}>Continue without saving</button>}</div>
    </section>}
  </>
}
