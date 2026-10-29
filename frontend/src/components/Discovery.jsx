import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { CATEGORIES, SERVICE_TYPES, DAYS, SKILLS, AGE_GROUPS, TRAVEL_SCOPES, LANGUAGES, money } from '../lib/profile'
import { EMPTY_FILTERS, cleanFilters, readSearch, searchParams, writeSearch } from '../lib/search'

export default function Discovery({ user, saved = false, initialFilters }) {
  const [initial] = useState(() => initialFilters && Object.keys(initialFilters).length ? { filters: cleanFilters(initialFilters), page: 1, rotation: '' } : readSearch(user?.id))
  const [filters, setFilters] = useState(initial.filters)
  const [draft, setDraft] = useState(initial.filters)
  const [page, setPage] = useState(saved ? 1 : initial.page)
  const rotation = useRef(initial.rotation)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [savingIds, setSavingIds] = useState([])
  const [savedIds, setSavedIds] = useState([])
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    const params = searchParams(filters, page, rotation.current)
    api(saved ? '/shortlist' : `/caregivers?${params}`, { authenticated: saved }).then(result => {
      if (cancelled) return
      rotation.current = result.rotation || ''
      if (!saved) writeSearch(user?.id, { filters, page, rotation: rotation.current })
      setData(result); setError('')
    }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [filters, page, saved, user?.id, version])
  useEffect(() => {
    let cancelled = false
    if (user?.role === 'employer') api('/shortlist').then(result => { if (!cancelled) setSavedIds(result.profiles.map(p => p.id)) }).catch(err => { if (!cancelled) setMessage(`Shortlist could not be loaded: ${err.message}`) })
    return () => { cancelled = true }
  }, [user])
  function search(event) {
    event.preventDefault(); rotation.current = ''; setPage(1); setFilters({ ...draft }); setData(null); setError(''); setMessage('')
  }
  function reset() {
    rotation.current = ''; setDraft({ ...EMPTY_FILTERS }); setFilters({ ...EMPTY_FILTERS }); setPage(1); setData(null); setError(''); setMessage('')
  }
  function change(key, value) { setDraft(current => ({ ...current, [key]: value })) }
  async function toggle(id) {
    const exists = savedIds.includes(id)
    setSavingIds(ids => [...ids, id]); setError('')
    try {
      await api(`/shortlist/${id}`, { method: exists ? 'DELETE' : 'POST' })
      setSavedIds(ids => exists ? ids.filter(value => value !== id) : [...ids, id])
      if (saved && exists) setData(current => ({ ...current, profiles: current.profiles.filter(p => p.id !== id) }))
      setMessage(exists ? 'Removed from shortlist.' : 'Saved to your shortlist.')
    } catch (err) { setError(err.message) }
    finally { setSavingIds(ids => ids.filter(value => value !== id)) }
  }
  function nextPage(value) { setData(null); setError(''); setPage(value) }
  return <>
    <div className="page-heading"><div><span className="eyebrow">FIND YOUR CARE</span><h1>{saved ? 'Your shortlist.' : 'A little help. A better fit.'}</h1><p>{saved ? 'Your saved caregivers, kept private to your account.' : 'Search and save for free. Paid placement always respects your filters.'}</p></div>{saved && <a className="button primary" href="#/browse">Find more caregivers →</a>}</div>
    {!saved && <form className="card form-section search-form" onSubmit={search}>
      <label>Name or keyword<input name="q" value={draft.q} onChange={e => change('q', e.target.value)} maxLength={120} placeholder="e.g. travel nanny, infant care, househelp" /><small>Searches stated services, skills, languages and profile details. Maid, house help and domestic worker match the same term; household duties must be stated by the caregiver.</small></label>
      <div className="three-columns"><label>Caregiver category<select value={draft.category} onChange={e => change('category', e.target.value)}><option value="">All categories</option>{Object.entries(CATEGORIES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Work arrangement<select value={draft.service_type} onChange={e => change('service_type', e.target.value)}><option value="">All arrangements</option>{Object.entries(SERVICE_TYPES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Location for live-out care<input value={draft.location} onChange={e => change('location', e.target.value)} placeholder="e.g. Nairobi" maxLength={120} disabled={draft.service_type !== 'live_out'} /><small>{draft.service_type === 'live_out' ? 'Search by area or town.' : 'Location applies when you select live-out care.'}</small></label></div>
      <div className="three-columns"><label>Minimum experience (years)<input type="number" value={draft.min_experience} onChange={e => change('min_experience', e.target.value)} min="0" /></label><label>Maximum budget (KES)<input type="number" value={draft.pay_max} onChange={e => change('pay_max', e.target.value)} min="0" /><small>Matches caregivers whose minimum expected pay fits your budget.</small></label><label>Pay period<select value={draft.pay_period} required={Boolean(draft.pay_max)} onChange={e => change('pay_period', e.target.value)}><option value="">Select a pay period</option><option value="monthly">Per month</option><option value="daily">Per day</option><option value="hourly">Per hour</option></select></label></div>
      <details><summary>Availability, skills & trust filters</summary><div className="three-columns"><label>Travel scope<select value={draft.travel_scope} onChange={e => change('travel_scope', e.target.value)}><option value="">Any travel scope</option>{Object.entries(TRAVEL_SCOPES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Child age group<select value={draft.age_group} onChange={e => change('age_group', e.target.value)}><option value="">Any age group</option>{Object.entries(AGE_GROUPS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Language<select value={draft.language} onChange={e => change('language', e.target.value)}><option value="">Any language</option>{LANGUAGES.map(language => <option key={language}>{language}</option>)}</select></label></div><div className="three-columns"><label>Available day<select value={draft.available_day} onChange={e => change('available_day', e.target.value)}><option value="">Any day</option>{DAYS.map(day => <option key={day}>{day}</option>)}</select></label><label>Skill<select value={draft.skill} onChange={e => change('skill', e.target.value)}><option value="">Any skill</option>{SKILLS.map(skill => <option key={skill}>{skill}</option>)}</select></label><label>Minimum rating<select value={draft.min_rating} onChange={e => change('min_rating', e.target.value)}><option value="">Any rating, including new caregivers</option><option value="4">4 stars and above</option><option value="3">3 stars and above</option></select></label></div><label className="choice"><input type="checkbox" checked={draft.identity_checked === 'true'} onChange={e => change('identity_checked', e.target.checked ? 'true' : '')} />Identity checked only</label></details>
      <div className="action-row"><button className="button primary">Find caregivers</button><button type="button" className="button secondary" onClick={reset}>Clear filters</button></div>
    </form>}
    {error && <div className="alert error" role="alert"><span>{error}</span><button className="button secondary" onClick={() => { rotation.current = ''; setPage(1); setData(null); setError(''); setVersion(v => v + 1) }}>Retry search</button></div>}{message && <p role="status">{message}</p>}
    {!data && !error ? <p role="status">Loading caregivers…</p> : data && !data.profiles.length ? <section className="card state-panel"><h2>{saved ? 'Your shortlist is empty' : 'No matching caregivers yet'}</h2><p>{saved ? 'Save profiles while browsing to find them here.' : 'Try another category or broaden your filters.'}</p>{!saved && <button className="button secondary" onClick={reset}>Clear filters</button>}</section> : data && <><p className="result-count" role="status">{saved ? data.profiles.length : data.total} {((saved ? data.profiles.length : data.total) === 1) ? 'caregiver' : 'caregivers'} {saved ? 'saved' : 'found'}</p><div className="caregiver-grid">{data.profiles.map(profile => <article className="card result-card" key={profile.id}><a href={`#/caregivers/${profile.id}`}><img className="result-photo" src={profile.photo_url} alt={profile.name} loading="lazy" /><div className="tags">{profile.is_available === false && <span>Not accepting new work</span>}{(profile.service_category === 'travel_nanny' || profile.service_types.includes('travel')) && <span>Travel nanny</span>}{profile.premium_active && <span className="premium-badge">Premium · promoted</span>}{profile.verification_status === 'verified' && <span>Identity checked</span>}</div><h2>{profile.name}</h2><p>{CATEGORIES[profile.service_category]}</p><p>{profile.location || 'Location not specified'} · {profile.years_experience} years</p><p>{profile.expected_pay_min != null ? `From KES ${money(profile.expected_pay_min)} / ${({ monthly: 'month', daily: 'day', hourly: 'hour' })[profile.pay_period]}` : 'Pay open to discussion'}</p><p>{profile.review_count ? `${Number(profile.rating_avg).toFixed(1)} ★ · ${profile.review_count} reviews` : 'No reviews yet'}</p><span className="text-button">View profile →</span></a>{user?.role === 'employer' && <button className="button secondary" disabled={savingIds.includes(profile.id)} onClick={() => toggle(profile.id)}>{savedIds.includes(profile.id) ? 'Remove from shortlist' : 'Save to shortlist'}</button>}</article>)}</div></>}
    {!saved && data?.total > 12 && <div className="pagination"><button className="button secondary" disabled={page === 1} onClick={() => nextPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / 12)}</span><button className="button secondary" disabled={page * 12 >= data.total} onClick={() => nextPage(page + 1)}>Next</button></div>}
  </>
}
