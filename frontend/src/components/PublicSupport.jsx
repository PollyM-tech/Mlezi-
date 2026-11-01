import { useState } from 'react'
import { api } from '../../convex/_generated/api.js'
import Turnstile from './Turnstile.jsx'
import SupportThread from './SupportThread.jsx'
import { SUPPORT_CATEGORIES, supportError } from '../lib/support.js'

async function client() { return (await import('../lib/convexClient.js')).getConvexClient() }
export default function PublicSupport() {
  const [credentials, setCredentials] = useState(null), [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [token, setToken] = useState(''), [reset, setReset] = useState(0), [loadCheck, setLoadCheck] = useState(false)
  async function run(fn) { setBusy(true); setError(''); try { await fn(); return true } catch (err) { setError(supportError(err)); return false } finally { setBusy(false) } }
  async function refresh(access) { setTicket(await (await client()).query(api.support.thread, access)) }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'mlezi-support-access.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <article className="card form-section public-support"><a href="/">← Mlezi home</a><span className="eyebrow">PRIVATE HELP, IN ONE PLACE</span><h1>Mlezi Support</h1><p>Get help with your account, profile, identity review or a technical problem. Replies stay in your ticket; the operator’s phone number and personal email are not displayed.</p><p><a className="button primary" href="/app/#/support">Sign in to my support tickets</a></p>
    <details><summary>Having trouble signing in?</summary><p>On the <a href="/app/#/signin">sign-in page</a>, use Forgot password, an email code or a magic link. If that does not work, submit a guest ticket below. A support ticket does not prove account ownership or bypass identity checks.</p></details>
    <p>Do not include passwords, verification codes, ID images, card details or M-Pesa PINs. For immediate danger, use local emergency services; this is not an emergency channel.</p>
    {error && <p role="alert">{error}</p>}
    <section><h2>Open a guest ticket</h2><p>You do not need to sign in. Save the ticket reference and private access key after submitting. Email notifications and recovery of lost keys are not available; return here to check replies.</p>
      <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form); run(async () => {
        try {
          const access = await (await client()).action(api.supportGuest.create, { subject: fields.get('subject'), category: fields.get('category'), body: fields.get('body'), email: fields.get('email'), website: fields.get('website'), challenge: token })
          setTicket(null); setCredentials(access); setLoadCheck(false); form.reset(); await refresh(access)
        } finally { setToken(''); setReset(value => value + 1) }
      }) }}>
        <label>Issue category<select name="category">{Object.entries(SUPPORT_CATEGORIES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Subject<input name="subject" maxLength={120} required /></label><label>Your email (optional, private)<input name="email" type="email" maxLength={254} autoComplete="email" /></label><label>What happened?<textarea name="body" maxLength={2000} required /></label>
        <div className="support-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
        {import.meta.env.VITE_TURNSTILE_SITE_KEY ? <><p>Submitting a guest ticket uses Cloudflare Turnstile to prevent spam. It receives browser and network request information when you load the check.</p>{loadCheck ? <Turnstile onToken={setToken} reset={reset} /> : <button className="button secondary" type="button" onClick={() => setLoadCheck(true)}>Load spam-protection check</button>}</> : <p role="status">Guest submission will be available when spam protection is configured. Signed-in support is available now.</p>}
        <button className="button primary" disabled={busy || !token}>{busy ? 'Submitting…' : 'Submit guest ticket'}</button>
      </form>
    </section>
    {credentials && <section className="support-receipt" aria-labelledby="receipt-heading"><h2 id="receipt-heading">Save your private ticket access</h2><p>Reference: <code>{credentials.id}</code></p><p>Access key: <code>{credentials.key}</code></p><p>Anyone with both values can read and reply to this ticket. Keep them private. They disappear from this page when you leave or reload.</p><button className="button secondary" onClick={download}>Download ticket access</button><button className="button secondary" disabled={busy} onClick={() => run(() => refresh(credentials))}>Check for replies</button></section>}
    <section><h2>Check an existing guest ticket</h2><form onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget), access = { id: String(fields.get('id')).trim(), key: String(fields.get('key')).trim() }; run(async () => { setTicket(null); setCredentials(null); await refresh(access); setCredentials(access) }) }}><label>Ticket reference<input name="id" required maxLength={64} /></label><label>Private access key<input name="key" type="password" autoComplete="off" required maxLength={64} /></label><button className="button secondary" disabled={busy}>View ticket</button></form></section>
    {ticket && credentials && <SupportThread ticket={ticket} busy={busy} onReply={body => run(async () => { await (await client()).mutation(api.support.reply, { ...credentials, body }); await refresh(credentials) })} onResolve={resolved => run(async () => { await (await client()).mutation(api.support.resolve, { ...credentials, resolved }); await refresh(credentials) })} />}
    <p><a href="/privacy/">Privacy notice</a> · <a href="/cookies/">Cookie policy</a></p>
  </article>
}
