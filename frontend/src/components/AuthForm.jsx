import { useState } from 'react'
import { api, setSession } from '../lib/api'

export default function AuthForm({ onLogin }) {
  const [registering, setRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const credentials = { email: form.get('email'), password: form.get('password') }
    setBusy(true); setError(''); setNotice('')
    try {
      if (registering) {
        await api('/auth/register', { method: 'POST', authenticated: false, body: { ...credentials, phone: form.get('phone'), role: 'caregiver' } })
        setRegistering(false)
        setNotice('Your account is ready. Signing you in…')
      }
      const data = await api('/auth/login', { method: 'POST', authenticated: false, body: credentials })
      setSession(data)
      onLogin(data.user)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="auth-layout">
    <section className="intro">
      <span className="eyebrow">CARE THAT MAKES A DIFFERENCE</span>
      <h1>Your care.<br />Their brighter<br /><em>beginnings.</em></h1>
      <p>Make a home for your experience. Create your caregiver profile and get ready to connect with families across Kenya.</p>
      <div className="intro-note"><span className="round-icon">✦</span><div><strong>Made for the work you love</strong><p>Free caregiver profiles. Your skills, your availability, your terms.</p></div></div>
    </section>
    <section className="card auth-card">
      <span className="eyebrow">YOUR MLEZI WORKSPACE</span>
      <h2>{registering ? 'Start your next chapter' : 'Welcome back'}</h2>
      <p>{registering ? 'Join as a nanny, babysitter, or early-years educator.' : 'Sign in to look after your caregiver profile.'}</p>
      <div className="tabs" aria-label="Account options">
        <button type="button" aria-pressed={!registering} disabled={busy} onClick={() => { setRegistering(false); setError(''); setNotice('') }}>Sign in</button>
        <button type="button" aria-pressed={registering} disabled={busy} onClick={() => { setRegistering(true); setError(''); setNotice('') }}>Create account</button>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert" role="status">{notice}</div>}
      <form onSubmit={submit}>
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={255} required disabled={busy} /></label>
        {registering && <label>Contact phone<input name="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" maxLength={32} required disabled={busy} /><small>Your phone number is kept out of your public profile.</small></label>}
        <label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} maxLength={128} required disabled={busy} />{registering && <small>Use at least 8 characters.</small>}</label>
        <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : registering ? 'Create caregiver account →' : 'Sign in →'}</button>
      </form>
      <p className="form-footnote">A little care goes a long way.</p>
    </section>
  </div>
}
