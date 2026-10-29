import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function IdentityCheck({ profile, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; if (profile) api('/verification/status').then(value => { if (active) setData(value) }).catch(err => { if (active) setError(err.message) }); return () => { active = false } }, [profile])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const body = new FormData(event.currentTarget); body.set('consent', 'true')
    try { const result = await api('/verification/submit', { method: 'POST', body }); setData(result); onChanged(result.verification_status) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const status = data?.verification_status
  return <section className="card form-section"><a href="#/workspace">← My profile</a><h1>Identity check</h1><p>Caregivers must be at least 18. An administrator checks the date of birth on your ID and compares your private national ID, selfie and profile photo. Premium membership and employer ratings are separate from identity checking.</p>{error && <p role="alert" className="alert error">{error}</p>}{!profile ? <p>Create your caregiver profile first.</p> : !data ? <p role="status">Loading identity status…</p> : <><p role="status">{({ verified: 'Your identity has been checked.', pending: 'Your identity request is awaiting administrator review.', rejected: 'Please correct the issue below and submit again.', unverified: 'Your identity has not been checked yet.' })[status]}</p>{data.submission?.rejection_reason && status !== 'verified' && <p>{data.submission.rejection_reason}</p>}{!['verified', 'pending'].includes(status) && <form onSubmit={submit}><label>A clear, recent selfie<input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required /></label><p>Use JPEG, PNG or WebP, up to 5 MB. Your selfie and national ID stay private.</p><label className="checkbox-label"><input type="checkbox" required />I allow Mlezi administrators to compare my selfie, uploaded ID and profile photo for this identity check.</label><button className="button primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit identity check'}</button></form>}<p>Changing your name or profile photo requires a new identity check. This check does not certify experience or suitability for a role.</p></>}</section>
}
