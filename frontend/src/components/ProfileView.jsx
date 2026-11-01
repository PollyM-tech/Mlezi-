import ReportProfile from './ReportProfile'
import { useState } from 'react'
import Reviews from './Reviews'
import ContactAccess from './ContactAccess'
import ShortlistButton from './ShortlistButton'
import { CATEGORIES, CATEGORY_DESCRIPTIONS, SERVICE_TYPES, AGE_GROUPS, TRAVEL_SCOPES, money } from '../lib/profile'

export default function ProfileView({ profile, owner = false, onEdit, user }) {
  const [reviewVersion, setReviewVersion] = useState(0)
  const min = profile.expected_pay_min
  const max = profile.expected_pay_max
  const pay = min != null && max != null ? `KES ${money(min)} – ${money(max)}` : min != null ? `From KES ${money(min)}` : max != null ? `Up to KES ${money(max)}` : 'Open to discussion'
  const period = { monthly: 'month', daily: 'day', hourly: 'hour' }[profile.pay_period]
  return <>
    {user?.role === 'employer' && <div className="profile-navigation"><a className="text-button" href="/caregivers">← Back to caregivers</a><ShortlistButton profileId={profile.id} /></div>}
    <div className="page-heading"><div><span className="eyebrow">{owner ? 'YOUR CAREGIVER WORKSPACE' : 'MEET YOUR CAREGIVER'}</span><h1>{owner ? 'A profile to be proud of.' : 'Care starts with connection.'}</h1><p>{owner ? 'Here’s how your experience comes together.' : 'Get to know their experience and approach to care.'}</p></div>{owner && <button className="button primary" onClick={onEdit}>Edit profile ↗</button>}</div>
    <div className="dashboard-grid"><section className="card profile-card"><div className="profile-banner"><span>Made of care.</span><span>✦</span></div><div className="profile-body"><img className="avatar" src={profile.photo_url} alt={`${profile.name}, caregiver`} /><div className="profile-title"><div><span className="eyebrow">{CATEGORIES[profile.service_category] || profile.service_category}</span><h2>{profile.name}</h2><p>{profile.location || 'Location not specified'} <span aria-hidden="true">·</span> {profile.years_experience} {profile.years_experience === 1 ? 'year' : 'years'} of experience</p></div><span className={`badge ${profile.verification_status === 'verified' ? 'verified' : ''}`}>{({ unverified: 'Identity not checked', pending: 'Verification pending', verified: 'Identity checked', rejected: 'Verification needs attention' })[profile.verification_status] || 'Identity not checked'}</span></div>
      {profile.premium_active && <div className="tags"><span className="premium-badge">Premium member · priority placement</span></div>}
      <p className="badge">{profile.is_available === false ? 'Not accepting new work' : 'Available for new work'}</p>
      <div className="profile-detail"><h3>Child age groups</h3><p>{profile.age_groups?.map(age => AGE_GROUPS[age] || age).join(', ') || 'Discuss with caregiver'}</p><h3>Languages</h3><p>{profile.languages?.join(', ') || 'Discuss with caregiver'}</p></div>
      {(profile.service_category === 'travel_nanny' || profile.service_types?.includes('travel')) && <div className="profile-detail"><h3>Travel & holiday childcare</h3><p>{TRAVEL_SCOPES[profile.travel_scope] || 'Travel scope to be discussed'}</p><p className="preserve-lines">{profile.travel_notes || 'Agree destinations, hours, travel costs and accommodation with the caregiver.'}</p></div>}
      <div className="profile-detail"><h3>About me</h3><p className="preserve-lines">{profile.bio || 'No introduction added yet.'}</p></div>
      {CATEGORY_DESCRIPTIONS[profile.service_category] && <div className="profile-detail"><h3>Care specialty</h3><p>{CATEGORY_DESCRIPTIONS[profile.service_category]}</p></div>}
      <div className="profile-detail"><h3>How I can help</h3><div className="tags">{profile.service_types.map(type => <span key={type}>{SERVICE_TYPES[type] || type}</span>)}</div>{profile.other_service_description && <p>{profile.other_service_description}</p>}</div>
      <div className="profile-detail"><h3>Skills & strengths</h3><div className="tags">{profile.skills?.length ? profile.skills.map(skill => <span key={skill}>{skill}</span>) : <p>No skills added yet.</p>}</div></div>
      <div className="profile-detail"><h3>Available days</h3><div className="tags">{profile.availability?.length ? profile.availability.map(day => <span key={day}>{day}</span>) : <p>Availability to be discussed.</p>}</div></div>
    </div></section>
    <aside><section className="card side-card"><span className="eyebrow">EXPECTED PAY</span><h2 className="pay">{pay}</h2>{(min != null || max != null) && <p>per {period}</p>}<hr /><p>Arrangements and final pay can be discussed with the family.</p></section>
      {owner ? <><section className="card side-card"><span className="eyebrow">JUST FOR YOU</span><h3>Your contact & documents</h3><p className="contact">{profile.phone || 'Add a contact phone number'}</p><p>National ID: {profile.national_id_uploaded ? 'Uploaded privately' : 'Not uploaded'}</p><small>These details are only shown to you here. Your ID is excluded from public responses.</small></section><section className="tip"><span className="eyebrow">A LITTLE PROFILE TIP</span><p>Specific experience tells a stronger story. Share the ages you’ve cared for and the activities you love doing together.</p></section></> : <><ContactAccess profileId={profile.id} user={user} onUnlocked={() => setReviewVersion(v => v + 1)} />{user && user.role!=='admin' && <ReportProfile profileId={profile.id} />}</>}
    </aside></div>
    {owner && <section className="card side-card"><h3>Premium membership · KES 500 / 365 days</h3><p>Receive rotating priority placement among matching profiles. Identity checks and ratings remain separate.</p><a className="button primary" href="/membership">Manage Premium</a></section>}
    <Reviews profileId={profile.id} user={user} owner={owner} version={reviewVersion} />
  </>
}
