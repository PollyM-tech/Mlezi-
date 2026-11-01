import { useState } from 'react'
import { api } from '../lib/api'

export default function CaregiverOverview({ profile, onUpdated, onEdit }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const details = [['Introduction', profile.bio], ['Phone number', profile.phone], ['Available days', profile.availability?.length], ['Skills', profile.skills?.length], ['Child age groups', profile.age_groups?.length], ['Languages', profile.languages?.length], ['Expected pay', profile.expected_pay_min != null || profile.expected_pay_max != null]]
  if (profile.service_category === 'travel_nanny' || profile.service_types?.includes('travel')) details.push(['Travel arrangements', profile.travel_scope && profile.travel_notes])
  const missing = details.filter(([, value]) => !value).map(([label]) => label)
  async function toggle() {
    setBusy(true); setError('')
    const body = new FormData(); body.set('is_available', String(profile.is_available === false))
    try { const result = await api('/caregivers/profile', { method: 'PUT', body }); onUpdated(result.profile) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="card form-section"><h2>Your caregiver workspace</h2>{!profile.adult_confirmed && <p className="privacy-note">Your profile stays hidden from employers until an administrator confirms your identity and that you are at least 18. Uploading documents alone does not approve your profile.</p>}<p>{profile.is_available === false ? 'You are not accepting new work. Previously unlocked contacts remain accessible.' : 'You are available for new work and can appear in matching searches.'}</p><button className="button secondary" disabled={busy} onClick={toggle}>{busy ? 'Saving…' : profile.is_available === false ? 'Accept new work' : 'Pause availability'}</button>{error && <p role="alert">{error}</p>}<p>Profile details: {details.length - missing.length} of {details.length} filled in.</p>{missing.length > 0 && <><p>Add: {missing.join(', ')}.</p><button className="text-button" onClick={onEdit}>Complete profile details →</button></>}<p><a href="/identity">Manage your identity check →</a></p></section>
}
