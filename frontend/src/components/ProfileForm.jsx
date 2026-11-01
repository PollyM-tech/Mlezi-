import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { CATEGORIES, CATEGORY_DESCRIPTIONS, SERVICE_TYPES, DAYS, SKILLS, AGE_GROUPS, TRAVEL_SCOPES, LANGUAGES } from '../lib/profile'

function Choices({ title, values, selected, onChange }) {
  return <fieldset className="choice-group"><legend>{title}</legend><div className="choices">{Object.entries(values).map(([value, label]) => <label className="choice" key={value}><input type="checkbox" checked={selected.includes(value)} onChange={event => onChange(event.target.checked ? [...selected, value] : selected.filter(item => item !== value))} /><span>{label}</span></label>)}</div></fieldset>
}

export default function ProfileForm({ profile, user, onSaved, onCancel }) {
  const [types, setTypes] = useState(profile?.service_types || [])
  const [category, setCategory] = useState(profile?.service_category || 'nanny')
  const [days, setDays] = useState(Array.isArray(profile?.availability) ? profile.availability : [])
  const [skills, setSkills] = useState(Array.isArray(profile?.skills) ? profile.skills : [])
  const [ages, setAges] = useState(profile?.age_groups || [])
  const [languages, setLanguages] = useState(profile?.languages || [])
  const [otherLanguages, setOtherLanguages] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileNames, setFileNames] = useState({})
  const errorRef = useRef(null)
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])
  const editing = Boolean(profile)
  const offersTravel = category === 'travel_nanny' || types.includes('travel')
  const extraLanguages = languages.filter(language => !LANGUAGES.includes(language))
  const extraSkills = skills.filter(skill => !SKILLS.includes(skill))
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!types.length) { setError('Select at least one service type.'); return }
    const body = new FormData(event.currentTarget)
    if ((category === 'other' || types.includes('other')) && !String(body.get('other_service_description') || '').trim()) { setError('Please describe the caregiver services you offer.'); return }
    body.set('service_types', JSON.stringify(types))
    body.set('availability', JSON.stringify(days))
    body.set('skills', JSON.stringify(skills))
    body.set('age_groups', JSON.stringify(ages))
    body.set('languages', JSON.stringify([...new Set([...languages, ...otherLanguages.split(',').map(item => item.trim()).filter(Boolean)])]))
    body.set('is_available', body.has('is_available') ? 'true' : 'false')
    for (const name of ['photo', 'national_id', 'selfie']) {
      const selected = event.currentTarget.elements.namedItem(name)?.files?.[0]
      if (selected) body.set(name, selected)
      const file = body.get(name)
      if (file?.size > 25 * 1024 * 1024) { setError('Choose source photos smaller than 25 MB. They are reduced securely before upload.'); return }
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
    <div className="page-heading"><div><span className="eyebrow">{editing ? 'KEEP YOUR STORY CURRENT' : 'LET’S GET TO KNOW YOU'}</span><h1>{editing ? 'Edit your profile' : 'Create your caregiver profile'}</h1><p>Help families understand the care you bring.</p></div>{editing && onCancel && <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
    {error && <div className="alert error" role="alert" tabIndex="-1" ref={errorRef}>{error}</div>}
    <fieldset disabled={busy} className="form-fields">
      <section className="card form-section"><div className="section-heading"><span className="step">01</span><div><h2>A little about you</h2><p>Your experience deserves to be seen.</p></div></div>
        <div className="two-columns"><label>Full name<input name="name" defaultValue={profile?.name || ''} maxLength={120} autoComplete="name" required /></label><label>Caregiver category<select name="service_category" value={category} onChange={event => { setCategory(event.target.value); if (event.target.value === 'travel_nanny') setTypes(current => current.includes('travel') ? current : [...current, 'travel']) }}>{Object.entries(CATEGORIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        {CATEGORY_DESCRIPTIONS[category] && <p className="privacy-note">{CATEGORY_DESCRIPTIONS[category]}</p>}
        <label>About you<textarea name="bio" rows={4} maxLength={3000} defaultValue={profile?.bio || ''} placeholder="Tell families about your approach to childcare, experience, and what you enjoy about caring for children." /><small>Do not include phone numbers, ID numbers, or other private details here.</small></label>
        <div className="two-columns"><label>Years of experience<input name="years_experience" type="number" min="0" max="80" step="1" defaultValue={profile?.years_experience ?? 0} required /></label><label>Contact phone<input name="phone" type="tel" maxLength={32} autoComplete="tel" defaultValue={profile?.phone || user.phone || ''} required /><small>Private contact information; excluded from your public profile.</small></label></div>
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">02</span><div><h2>The way you work</h2><p>Choose the arrangements that suit you.</p></div></div>
        <Choices title="Service types · select at least one" values={SERVICE_TYPES} selected={types} onChange={setTypes} />
        {offersTravel && <div className="travel-options"><h3>Travel nanny details</h3><p>Help families during trips, holidays, and outings. Agree childcare duties and working hours with the family.</p><label>Where can you travel?<select name="travel_scope" defaultValue={profile?.travel_scope || ''}><option value="">Discuss with the family</option>{Object.entries(TRAVEL_SCOPES).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Travel arrangements & notice<textarea name="travel_notes" defaultValue={profile?.travel_notes || ''} maxLength={1000} rows={3} placeholder="For example: local family trips, 3 days’ notice, up to a week away. Discuss transport, accommodation, rest time, and pay with the family." /><small>Do not share passport numbers, ID details, or your exact address.</small></label></div>}
        <p className="privacy-note">Choose all the services and work arrangements you offer. Live-in means staying in the family’s home. Live-out / day nanny (daybags) means commuting to and from the family’s home daily on a fixed schedule.</p>
        {(category === 'other' || types.includes('other')) && <label>What caregiver services do you offer? · required<textarea name="other_service_description" maxLength={1000} rows={3} placeholder="Describe the care you provide, the duties you can help with, and any relevant experience." defaultValue={profile?.other_service_description || ''} required /></label>}
        <label>Location {types.includes('live_out') ? '· required for live-out care' : '· optional'}<input name="location" maxLength={120} defaultValue={profile?.location || ''} placeholder="e.g. Kilimani, Nairobi" required={types.includes('live_out')} /><small>Use your area or town, rather than your exact home address.</small></label>
        <label className="choice"><input name="is_available" type="checkbox" defaultChecked={profile?.is_available !== false} />I am available for new work</label><small>When switched off, you will not appear in discovery. Existing saved profiles and unlocked contacts remain accessible.</small>
        <Choices title="Available days" values={Object.fromEntries(DAYS.map(day => [day, day]))} selected={days} onChange={setDays} />
        <Choices title="Ages I have experience caring for" values={AGE_GROUPS} selected={ages} onChange={setAges} />
        <Choices title="Languages I can use with children" values={Object.fromEntries([...LANGUAGES, ...extraLanguages].map(language => [language, language]))} selected={languages} onChange={setLanguages} />
        <label>Other languages · optional<input value={otherLanguages} onChange={event => setOtherLanguages(event.target.value)} maxLength={300} placeholder="Separate languages with commas" /></label>
        <Choices title="Skills" values={Object.fromEntries([...SKILLS, ...extraSkills].map(skill => [skill, skill]))} selected={skills} onChange={setSkills} />
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">03</span><div><h2>Your expected pay</h2><p>Give families an idea of your preferred range.</p></div></div>
        <div className="three-columns"><label>Minimum (KES)<input name="expected_pay_min" type="number" min="0" max="2147483647" step="1" defaultValue={profile?.expected_pay_min ?? ''} placeholder="e.g. 15000" /></label><label>Maximum (KES)<input name="expected_pay_max" type="number" min="0" max="2147483647" step="1" defaultValue={profile?.expected_pay_max ?? ''} placeholder="e.g. 25000" /></label><label>Pay period<select name="pay_period" defaultValue={profile?.pay_period || 'monthly'}><option value="monthly">Per month</option><option value="daily">Per day</option><option value="hourly">Per hour</option></select></label></div>
      </section>
      <section className="card form-section"><div className="section-heading"><span className="step">04</span><div><h2>{editing ? 'Your profile photo' : 'Put a face to your profile'}</h2><p>{editing ? 'Upload a new photo only if you want to replace the current one.' : 'A clear photo helps families get to know you.'}</p></div></div>
        <label className="upload">{editing && profile?.photo_url ? 'Replace profile photo · optional' : 'Profile photo · required'}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required={!editing || !profile?.photo_url} onChange={event => { const file = event.target.files[0]; setFileNames({ ...fileNames, photo: file?.name }); setPhotoPreview(file ? URL.createObjectURL(file) : '') }} /><small>{fileNames.photo || 'JPEG, PNG, or WebP · up to 25 MB before preparation'}</small></label>
        {(photoPreview || profile?.photo_url) && <img className="profile-upload-preview" src={photoPreview || profile.photo_url} alt="Your profile photo preview" />}
        {!editing && <label className="upload">National ID image · required<input name="national_id" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFileNames({ ...fileNames, national_id: event.target.files[0]?.name })} /><small>{fileNames.national_id || 'Stored privately. Never included in your public profile. Up to 25 MB before preparation.'}</small></label>}
        {!editing && <><label className="upload">Recent selfie · required<input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required /><small>Stored privately for an administrator to compare with your ID and profile photo. Up to 25 MB before preparation.</small></label><label className="checkbox-label"><input name="consent" value="true" type="checkbox" required />I allow Mlezi to compare my ID, selfie and profile photo for an identity check.</label><p><a href="/privacy/#privacy-identity" target="_blank" rel="noopener">Read how identity evidence is used and retained</a>.</p></>}
        <div className="privacy-note">{editing ? 'Your approved identity check is a one-time account check. Changing your profile name or photo does not remove approval. A photo change while review is pending requires a fresh submission.' : 'Caregivers must be at least 18. All three images are required. Saving your profile submits them for administrator review. Uploading alone does not grant an Identity checked badge.'}</div>
      </section>
    </fieldset>
    <div className="save-bar"><p>{busy ? 'Saving your profile. Please keep this page open…' : 'You can come back and update your profile anytime.'}</p><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes →' : 'Create my profile →'}</button></div>
  </form>
}
