import { useState } from 'react'
import { api } from '../../convex/_generated/api.js'
import Turnstile from './Turnstile.jsx'
import { SUPPORT_CATEGORIES, supportError } from '../lib/support.js'

async function client() { return (await import('../lib/convexClient.js')).getConvexClient() }
export default function PublicSupport() {
  const [receipt, setReceipt] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [token, setToken] = useState(''), [reset, setReset] = useState(0), [loadCheck, setLoadCheck] = useState(false)
  async function run(fn) { setBusy(true); setError(''); try { await fn(); return true } catch (err) { setError(supportError(err)); return false } finally { setBusy(false) } }
  return <article className="card form-section public-support"><a href="/">← Mlezi home</a><span className="eyebrow">PRIVATE HELP, IN ONE PLACE</span><h1>Mlezi Support</h1><p>Get help with your account, profile, identity review or a technical problem. Fill in the form and our team will follow up by email within 48 hours. You do not need an account.</p><p>Already have an account? <a href="/tickets">View my signed-in support tickets</a>.</p>
    <details><summary>Having trouble signing in?</summary><p>On the <a href="/signin">sign-in page</a>, use Forgot password, an email code or a magic link. If that does not work, submit a guest ticket below. A support ticket does not prove account ownership or bypass identity checks.</p></details>
    <p>Do not include passwords, verification codes, ID images, card details or M-Pesa PINs. For immediate danger, use local emergency services; this is not an emergency channel.</p>
    {error && <p role="alert">{error}</p>}
    <section><h2>Tell us what happened</h2><p>Enter an email address you can access. We will send an automatic acknowledgement and address your issue within 48 hours.</p>
      <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form); run(async () => {
        try {
          const result = await (await client()).action(api.supportGuest.create, { subject: fields.get('subject'), category: fields.get('category'), body: fields.get('body'), email: fields.get('email'), website: fields.get('website'), challenge: token })
          setReceipt(result.id); setLoadCheck(false); form.reset()
        } finally { setToken(''); setReset(value => value + 1) }
      }) }}>
        <label>Issue category<select name="category">{Object.entries(SUPPORT_CATEGORIES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Subject<input name="subject" maxLength={120} required /></label><label>Your email<input name="email" type="email" required maxLength={254} autoComplete="email" aria-describedby="support-email-use" /></label><small id="support-email-use">Used for acknowledgement and support follow-up; not published. <a href="/privacy/" target="_blank" rel="noopener">Privacy notice</a>.</small><label>What happened?<textarea name="body" maxLength={2000} required /></label>
        <div className="support-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
        {import.meta.env.VITE_TURNSTILE_SITE_KEY ? <><p>Submitting a guest ticket uses Cloudflare Turnstile to prevent spam. It receives browser and network request information when you load the check.</p>{loadCheck ? <Turnstile onToken={setToken} reset={reset} /> : <button className="button secondary" type="button" onClick={() => setLoadCheck(true)}>Load spam-protection check</button>}</> : <p role="status">Guest submission will be available when spam protection is configured. Signed-in support is available now.</p>}
        <button className="button primary" disabled={busy || !token}>{busy ? 'Submitting…' : 'Submit guest ticket'}</button>
      </form>
    </section>
    {receipt && <section className="support-receipt" aria-labelledby="receipt-heading" role="status"><h2 id="receipt-heading">We have received your issue</h2><p>Thank you for contacting Mlezi Support. Our team will address your issue within 48 hours and follow up by email. Please check your inbox and spam folder for the acknowledgement.</p><p>Ticket reference: <code>{receipt}</code></p></section>}
    <p><a href="/privacy/">Privacy notice</a> · <a href="/cookies/">Cookie policy</a></p>
  </article>
}
