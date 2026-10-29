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
  return <section className="card side-card"><h3>Connect with this caregiver</h3>{error && <p role="alert">{error}</p>}
    {user?.role !== 'employer' ? <><p>{user ? 'Contact unlocking is available to employer accounts. Sign out to use an employer account.' : 'Sign in as an employer to unlock private contact details.'}</p>{!user && <a className="button secondary" href="#/signin">Sign in</a>}</>
      : access?.unlocked ? <><p><a href={`tel:${access.contact.phone || ''}`}>{access.contact.phone || 'Phone not provided'}</a></p><p className="contact"><a href={`mailto:${access.contact.email}`}>{access.contact.email}</a></p><small>This contact stays accessible after your pass expires.</small></>
        : access?.available === false && !access.unlocked ? <p>This caregiver is not accepting new requests. Your existing unlocked contacts remain accessible.</p>
        : access?.can_unlock ? <><p>Your pass is active. Unlock this contact at no extra cost.</p><button className="button primary" disabled={busy} onClick={unlock}>{busy ? 'Unlocking…' : 'Unlock contact'}</button></>
          : access ? <><p>Get a pass: KES 300 for 30 days or KES 500 for 90 days.</p><a className="button primary" href="#/membership">Get contact access</a></> : <p>Checking contact access…</p>}
  </section>
}
