import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Membership({ user }) {
  const [membership, setMembership] = useState(null)
  const [payments, setPayments] = useState([])
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    Promise.all([api('/memberships'), api('/payments')]).then(([status, history]) => {
      if (!cancelled) { setMembership(status); setPayments(history.payments); setPending(history.payments.find(p => p.status === 'pending') || null) }
    }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [version])
  useEffect(() => {
    if (!pending) return
    let cancelled = false
    let ticks = 0
    const timer = setInterval(async () => {
      if (++ticks > 24) { clearInterval(timer); return }
      try {
        const data = await api(`/payments/${pending.id}`)
        if (cancelled) return
        setMessage(data.payment.result_description || data.message || '')
        if (data.payment.status !== 'pending') { setPending(null); setVersion(v => v + 1); clearInterval(timer) }
      } catch (err) { if (!cancelled) setError(err.message) }
    }, 10000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [pending])
  async function buy(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const data = await api(user.role === 'employer' ? '/payments/unlock-pass' : '/payments/caregiver-premium', {
        method: 'POST', body: { plan_code: form.get('plan_code'), phone: form.get('phone') },
      })
      setPending(data.payment); setMessage(data.payment.result_description || data.message || 'Check your phone for the M-Pesa prompt.')
      setVersion(v => v + 1)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function check() {
    setBusy(true); setError('')
    try {
      const data = await api(`/payments/${pending.id}`)
      setMessage(data.payment.result_description || data.message || '')
      setVersion(v => v + 1)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">MEMBERSHIP</span><h1>{user.role === 'employer' ? 'Make your next connection.' : 'Let your care be seen.'}</h1><p>{user.role === 'employer' ? 'Unlock new caregiver contacts with a contact-access pass.' : 'Premium visibility for KES 500 a year. Your free profile stays yours.'}</p></div></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    {message && <div className="alert" role="status">{message}</div>}
    {!membership ? <p>Loading membership…</p> : <div className="dashboard-grid"><section className="card form-section"><span className="badge">{membership.active ? 'Active' : 'Inactive'}</span><h2>{user.role === 'employer' ? 'Your contact-access pass' : 'Your Premium membership'}</h2>
      {membership.expires_at && <p>Expiry: {new Date(membership.expires_at).toLocaleString()}</p>}
      {membership.payments_enabled === false && <p>M-Pesa payments are coming soon.</p>}<form onSubmit={buy}><label>Choose your plan<select name="plan_code" disabled={busy || Boolean(pending) || membership.payments_enabled === false}>{membership.plans.map(p => <option value={p.code} key={p.code}>KES {p.amount} · {p.days} days</option>)}</select></label><label>M-Pesa phone number<input name="phone" type="tel" defaultValue={user.phone || ''} placeholder="0712 345 678" required disabled={busy || Boolean(pending) || membership.payments_enabled === false} /></label><button className="button primary" disabled={busy || Boolean(pending) || membership.payments_enabled === false}>{busy ? 'Please wait…' : membership.active ? 'Renew with M-Pesa' : 'Pay with M-Pesa'}</button></form>
      {pending && <div className="privacy-note"><p>Payment #{pending.id} is awaiting confirmation. Don’t pay again while it is pending.</p><button className="button secondary" onClick={check} disabled={busy}>Check payment status</button></div>}
    </section><aside className="card side-card"><h3>How it works</h3><p>Renew manually when you choose. Early renewal adds time to your existing expiry. There are no automatic debits.</p><p>{user.role === 'employer' ? 'Previously unlocked contacts remain accessible after expiry. Renew only when you want to unlock new contacts.' : 'Premium profiles appear first within matching categories and filters, with rotating placement. Premium does not mean identity checked or guarantee employment.'}</p></aside></div>}
    <section className="card form-section"><h2>Recent payments</h2>{payments.length ? payments.map(p => <div className="payment-row" key={p.id}><span>#{p.id} · KES {p.amount} · {p.plan_code?.replaceAll('_', ' ') || p.type}</span><strong>{p.status}</strong></div>) : <p>No payments yet.</p>}</section>
  </>
}
