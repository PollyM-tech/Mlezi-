import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { CATEGORIES, CATEGORY_DESCRIPTIONS, SERVICE_TYPES, DAYS, SKILLS } from '../lib/profile'

function Choices({ title, values, selected, onChange }) {
  return <fieldset className="choice-group"><legend>{title}</legend><div className="choices">{Object.entries(values).map(([value, label]) => <label className="choice" key={value}><input type="checkbox" checked={selected.includes(value)} onChange={event => onChange(event.target.checked ? [...selected, value] : selected.filter(item => item !== value))} /><span>{label}</span></label>)}</div></fieldset>
}

export default function ProfileForm({ profile, user, onSaved, onCancel }) {
  const [types, setTypes] = useState(profile?.service_types || [])
  const [category, setCategory] = useState(profile?.service_category || 'nanny')
  const [days, setDays] = useState(Array.isArray(profile?.availability) ? profile.availability : [])
  const [skills, setSkills] = useState(Array.isArray(profile?.skills) ? profile.skills : [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileNames, setFileNames] = useState({})
  const errorRef = useRef(null)
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])
  const editing = Boolean(profile)
  const extraSkills = skills.filter(skill => !SKILLS.includes(skill))
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!types.length) { setError('Select at least one service type.'); return }
    const body = new FormData(event.currentTarget)
    body.set('service_types', JSON.stringify(types))
    body.set('availability', JSON.stringify(days))
    body.set('skills', JSON.stringify(skills))
    for (const name of ['photo', 'national_id']) {
      const file = body.get(name)
      if (file?.size > 5 * 1024 * 1024) { setError('Each image must be 5 MB or smaller.'); return }
      if (!file?.size) body.delete(name)
    }
    if (body.get('expected_pay_min') && body.get('expected_pay_max') && Number(body.get('expected_pay_min')) > Number(body.get('expected_pay_max'))) {
      setError('Minimum pay cannot exceed maximum pay.'); return
    }
    setBusy(true)
    try {
      const result = await api('/caregivers/profile', { method: editing ? 'PUT' : 'POST', body })
      onSaved(result.profile)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="profile-form">
    <div className="page-heading"><div><span className="eyebrow">{editing ? 'KEEP YOUR STORY CURRENT' : 'LET’S GET TO KNOW YOU'}</span><h1>{editing ? 'Edit your profile' : 'Create your caregiver profile'}</h1><p>Help families understand the care you bring.</p></div>{editing && <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
    {error && <div className="alert error" role="alert" tabIndex="-1" ref={errorRef}>{error}</div>}
    <fieldset disabled={busy} className="form-fields">
      <section className="card form-section"><div className="section-heading"><span className="step">01</span><div><h2>A little about you</h2><p>Your experience deserves to be seen.</p></div></div>
        <div className="two-columns"><label>Full name<input name="name" defaultValue={profile?.name || ''} maxLength={120} autoComplete="name" required /></label><label>Caregiver category<select name="service_category" value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(CATEGORIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        {CATEGORY_DESCRIPTIONS[category] && <p className="privacy-note">{CATEGORY_DESCRIPTIONS[category]}</p>}
        <label>About you<textarea name="bio" rows={4} maxLength={3000} defaultValue={profile?.bio || ''} placeholder="Tell families about your approach to childcare, experience, and what you enjoy about caring for children." /><small>Do not include phone numbers, ID numbers, or other private details here.</small></label>
        <div className="two-columns"><label>Years of experience<input name="years_experience" type="number" min="0" max="80" step="1" defaultValue={profile?.years_experience ?? 0} required /></label><label>Contact phone<input name="phone" type="tel" maxLength={32} autoComplete="tel" defaultValue={profile?.phone || user.phone || ''} required /><small>Private contact information; excluded from your public profile.</small></label></div>
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">02</span><div><h2>The way you work</h2><p>Choose the arrangements that suit you.</p></div></div>
        <Choices title="Service types · select at least one" values={SERVICE_TYPES} selected={types} onChange={setTypes} />
        <p className="privacy-note">Choose all the services and work arrangements you offer. Live-in means staying in the family’s home. Live-out / day nanny (daybags) means commuting to and from the family’s home daily on a fixed schedule.</p>
        {(category === 'other' || types.includes('other')) && <label>Describe your other service<textarea name="other_service_description" maxLength={1000} rows={2} defaultValue={profile?.other_service_description || ''} required /></label>}
        <label>Location {types.includes('live_out') ? '· required for live-out care' : '· optional'}<input name="location" maxLength={120} defaultValue={profile?.location || ''} placeholder="e.g. Kilimani, Nairobi" required={types.includes('live_out')} /><small>Use your area or town, rather than your exact home address.</small></label>
        <Choices title="Available days" values={Object.fromEntries(DAYS.map(day => [day, day]))} selected={days} onChange={setDays} />
        <Choices title="Skills" values={Object.fromEntries([...SKILLS, ...extraSkills].map(skill => [skill, skill]))} selected={skills} onChange={setSkills} />
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">03</span><div><h2>Your expected pay</h2><p>Give families an idea of your preferred range.</p></div></div>
        <div className="three-columns"><label>Minimum (KES)<input name="expected_pay_min" type="number" min="0" max="2147483647" step="1" defaultValue={profile?.expected_pay_min ?? ''} placeholder="e.g. 15000" /></label><label>Maximum (KES)<input name="expected_pay_max" type="number" min="0" max="2147483647" step="1" defaultValue={profile?.expected_pay_max ?? ''} placeholder="e.g. 25000" /></label><label>Pay period<select name="pay_period" defaultValue={profile?.pay_period || 'monthly'}><option value="monthly">Per month</option><option value="daily">Per day</option><option value="hourly">Per hour</option></select></label></div>
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">04</span><div><h2>{editing ? 'Your profile photo' : 'Put a face to your profile'}</h2><p>{editing ? 'Upload a new photo only if you want to replace the current one.' : 'A clear photo helps families get to know you.'}</p></div></div>
        <label className="upload">{editing ? 'Replace profile photo · optional' : 'Profile photo · required'}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required={!editing} onChange={event => setFileNames({ ...fileNames, photo: event.target.files[0]?.name })} /><small>{fileNames.photo || 'JPEG, PNG, or WebP · maximum 5 MB'}</small></label>
        {!editing && <label className="upload">National ID image · required<input name="national_id" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFileNames({ ...fileNames, national_id: event.target.files[0]?.name })} /><small>{fileNames.national_id || 'Stored privately. Never included in your public profile. Maximum 5 MB.'}</small></label>}
        <div className="privacy-note">{editing ? 'Your national ID stays private. Changing your photo does not replace your ID.' : 'Uploading your ID does not automatically grant a verified badge. Document review is a separate process.'}</div>
      </section>
    </fieldset>
    <div className="save-bar"><p>{busy ? 'Saving your profile. Please keep this page open…' : 'You can come back and update your profile anytime.'}</p><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes →' : 'Create my profile →'}</button></div>
  </form>
}
