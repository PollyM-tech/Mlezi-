import { saveRegistrationDraft } from '../lib/registrationDraft.js'
import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api.js'

function messageFor(error) {
  if (typeof error?.data === 'string') return error.data
  if (typeof error?.data?.message === 'string') return error.data.message
  const message = error?.message || ''
  if (/InvalidAccountId|InvalidSecret|Invalid credentials/i.test(message)) return 'The email or password is incorrect. You can also sign in with an email code or magic link.'
  if (/AccountAlreadyExists/i.test(message)) return 'An account already exists. Sign in or use email recovery.'
  if (/verify code|expired|Invalid code/i.test(message)) return 'That code is invalid or expired. Request a new one and try again.'
  if (/rate|Too many/i.test(message)) return 'Too many attempts. Please wait before trying again.'
  return 'We could not complete sign-in. Check your details and try again.'
}

export default function ConvexAuthForm({ initialRegistering = false, initialRole = 'caregiver' }) {
  const { signIn } = useAuthActions()
  const settings = useQuery(api.accounts.authSettings)
  const [registering, setRegistering] = useState(initialRegistering)
  const [method, setMethod] = useState('password')
  const [step, setStep] = useState('start')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(initialRole)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function reset() { setStep('start'); setError(''); setNotice('') }
  async function verify(provider, params) {
    const result = await signIn(provider, params)
    if (!result.signingIn) throw new Error('Invalid code')
  }
  async function send(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    const fields = new FormData(event.currentTarget)
    const address = String(fields.get('email') || email).trim().toLowerCase()
    setEmail(address)
    try {
      if (step === 'start' && registering) {
        if (!name.trim()) { setError('Enter your full name.'); return }
        if (!/^\+?[0-9][0-9 ()-]{6,30}$/.test(phone.trim())) { setError('Enter a valid contact phone number.'); return }
        saveRegistrationDraft({ role, phone: phone.trim(), name: name.trim(), email: address })
      }
      if (step === 'reset-start') {
        await signIn('password-recovery', { flow: 'reset', email: address })
        setStep('reset-code'); setNotice('If an account exists for this email, a reset code has been sent. Check your inbox and spam folder.')
      } else if (step === 'reset-code') {
        if (fields.get('newPassword') !== fields.get('confirmPassword')) throw new Error('Passwords do not match')
        await verify('password', { flow: 'reset-verification', email: address, code: fields.get('code'), newPassword: fields.get('newPassword') })
      } else if (step === 'verify-email') {
        await verify('password', { flow: 'email-verification', email: address, code: fields.get('code') })
      } else if (step === 'otp-code') {
        await verify('email-otp', { email: address, code: fields.get('code') })
      } else if (method === 'password') {
        const result = await signIn('password', { flow: registering ? 'signUp' : 'signIn', email: address, password: fields.get('password'), redirectTo: `${window.location.origin}/signin` })
        if (!result.signingIn) { setStep('verify-email'); setNotice('Enter the verification code sent to your email. It expires in 10 minutes.') }
      } else {
        await signIn(method === 'otp' ? 'email-otp' : 'magic-link', { email: address, redirectTo: `${window.location.origin}/signin` })
        setStep(method === 'otp' ? 'otp-code' : 'magic-sent')
        setNotice(method === 'otp' ? 'Enter the email code below. It expires in 10 minutes.' : 'Check your email for a sign-in link. It expires in 10 minutes and can be used once.')
      }
    } catch (err) { setError(err.message === 'Passwords do not match' ? 'Your passwords do not match.' : messageFor(err)) }
    finally { setBusy(false) }
  }
  async function resend() {
    setBusy(true); setError('')
    try {
      await signIn(step === 'otp-code' ? 'email-otp' : step === 'reset-code' ? 'password-recovery' : 'password', { email, ...(step === 'otp-code' ? {} : { flow: step === 'reset-code' ? 'reset' : 'email-verification' }), redirectTo: `${window.location.origin}/signin` })
      setNotice('A new code has been requested. Check your inbox and spam folder.')
    } catch (err) { setError(messageFor(err)) } finally { setBusy(false) }
  }
  const codeStep = ['verify-email', 'otp-code', 'reset-code'].includes(step)
  const resetFlow = step.startsWith('reset-')
  return <div className="auth-layout"><section className="intro"><span className="eyebrow">CARE THAT MAKES A DIFFERENCE</span><h1>Your care.<br />{' '}Their brighter<br />{' '}<em>beginnings.</em></h1><p>Build your caregiver profile or find care for your family across Kenya.</p></section><section className="card auth-card">
    <span className="eyebrow">YOUR MLEZI WORKSPACE</span><h2>{resetFlow ? 'Reset your password' : codeStep ? 'Check your email' : registering ? 'Start your next chapter' : 'Welcome back'}</h2>
    {step === 'start' && <><div className="tabs" aria-label="Account options"><button type="button" aria-pressed={!registering} disabled={busy} onClick={() => { setRegistering(false); reset() }}>Sign in</button><button type="button" aria-pressed={registering} disabled={busy} onClick={() => { setRegistering(true); reset() }}>Create account</button></div><label>How would you like to continue?<select value={method} disabled={busy} onChange={event => { setMethod(event.target.value); reset() }}><option value="password">Email & password</option><option value="magic">Email me a magic link</option><option value="otp">Email me a one-time code</option></select></label></>}
    {settings?.testSender && <p className="alert" role="status">Email delivery is in test mode. Public registration needs a verified sending domain; the test sender can only deliver to its approved test recipient.</p>}
    {settings && !settings.emailReady && <p className="alert" role="status">Email sign-in is being set up. Please try again once email delivery is available.</p>}
    {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}
    {step === 'magic-sent' ? <button className="text-button" onClick={reset}>Use another sign-in method</button> : <form onSubmit={send}>
      {step === 'start' && registering && <><label>I am joining as<select value={role} disabled={busy} onChange={event => setRole(event.target.value)}><option value="caregiver">Caregiver / nanny</option><option value="employer">Employer / parent</option></select></label><label>Your full name<input name="name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={120} required disabled={busy} /></label><label>Contact phone<input name="phone" value={phone} onChange={event => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={32} required disabled={busy} /></label></>}
      <label>Email address<input name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} readOnly={codeStep} maxLength={255} required disabled={busy} /></label>
      {step === 'start' && method === 'password' && <label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} maxLength={128} required disabled={busy} /></label>}
      {codeStep && <label>Email verification code<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required disabled={busy} /><small>Enter the 8-digit code from your most recent email.</small></label>}
      {step === 'reset-code' && <><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} /></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} /></label></>}
      <button className="button primary full" disabled={busy || !settings?.emailReady}>{busy ? 'Please wait…' : step === 'reset-start' ? 'Send reset code' : step === 'reset-code' ? 'Set new password' : codeStep ? 'Verify code & continue' : method === 'magic' ? 'Send magic link' : method === 'otp' ? 'Send email code' : registering ? 'Create account →' : 'Sign in →'}</button>
    </form>}
    {codeStep && <button className="text-button" disabled={busy || !settings?.emailReady} onClick={resend}>Resend code</button>}
    {step === 'start' && !registering && method === 'password' && <button className="text-button" disabled={busy} onClick={() => { setStep('reset-start'); setError(''); setNotice('') }}>Forgot password?</button>}
    {step !== 'start' && step !== 'magic-sent' && <button className="text-button" disabled={busy} onClick={reset}>Back to sign in</button>}
    <p className="form-footnote">Read the <a href="/terms/">Terms of use</a> and <a href="/privacy/">Privacy notice</a> before creating an account. You will accept the terms when completing your account.</p><p className="form-footnote">Magic links and email codes also let you sign in without remembering a password. When creating an account, choose your role and enter your name and phone with any sign-up method. Returning members only need their email and chosen sign-in method.</p>
  </section></div>
}
