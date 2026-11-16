import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ContactAccess({ profileId, user, onUnlocked }) {
  const [access, setAccess] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    if (user?.role === 'employer') api(`/contact/unlock/${profileId}`).then(result => { if (!cancelled) setAccess(result) }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [profileId, user])
  async function unlock() {
    setBusy(true); setError('')
    try { const data = await api(`/contact/unlock/${profileId}`, { method: 'POST' }); setAccess(data); onUnlocked?.() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <section className="card side-card"><h3>Connect with this nanny or babysitter</h3>{error && <p role="alert">{error}</p>}
    {user?.role !== 'employer' ? <><p>{user ? 'Contact unlocking is available to employer accounts. Sign out to use an employer account.' : 'Sign in as an employer to unlock private contact details.'}</p>{!user && <a className="button secondary" href="/signin">Sign in</a>}</>
      : access?.visibility_hidden ? <p>This profile is hidden from new marketplace connections. Contacts shared through an accepted job offer remain accessible.</p>
      : access?.identity_pending ? <><p>This nanny or babysitter’s age and identity are awaiting review. Contact access becomes available after approval.</p><p>Payment does not approve this nanny or babysitter’s identity.</p></>
      : access?.unlocked ? <><p><a href={`tel:${access.contact.phone || ''}`}>{access.contact.phone || 'Phone not provided'}</a></p><p className="contact"><a href={`mailto:${access.contact.email}`}>{access.contact.email}</a></p><small>An active pass is required to view this contact.</small></>
        : access?.available === false && !access.unlocked ? <p>This nanny or babysitter is not accepting new requests. Your existing unlocked contacts remain accessible.</p>
        : access?.can_unlock ? <><p>Your pass is active. Unlock this contact at no extra cost.</p><button className="button primary" disabled={busy} onClick={unlock}>{busy ? 'Unlocking…' : 'Unlock contact'}</button></>
          : access ? <p>An active contact-access pass is required. Pay using M-Pesa STK Push in Membership.</p> : <p>Checking contact access…</p>}
    {['employer', 'caregiver'].includes(user?.role) && <a className="button primary" href="/membership">View membership →</a>}
  </section>
}
