import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { CATEGORIES } from '../lib/profile'

function useEmployer(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    api(path).then(result => { if (!cancelled) { setData({ path, result }); setError('') } }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [path, version])
  return { data: data?.path === path ? data.result : null, error, retry: () => { setError(''); setVersion(v => v + 1) } }
}

function LoadState({ error, retry }) {
  return error ? <div className="alert error" role="alert"><span>{error}</span><button className="button secondary" onClick={retry}>Try again</button></div> : <p role="status">Loading your workspace…</p>
}

export function EmployerDashboard() {
  const { data, error, retry } = useEmployer('/employers/dashboard')
  if (!data) return <LoadState error={error} retry={retry} />
  const name = data.profile.name.split(' ')[0]
  return <>
    <div className="page-heading"><div><span className="eyebrow">YOUR PRIVATE FAMILY WORKSPACE</span><h1>{name ? `Welcome, ${name}.` : 'Find care that fits your family.'}</h1><p>Explore caregivers, keep a shortlist, and return to the connections you’ve made.</p></div><a className="button primary" href="/caregivers">Find a caregiver →</a></div>
    <div className="workspace-stats"><a className="card stat-card" href="/shortlist"><span className="eyebrow">SAVED CAREGIVERS</span><strong>{data.counts.shortlist}</strong><span>Open your shortlist →</span></a><a className="card stat-card" href="/contacts"><span className="eyebrow">UNLOCKED CONTACTS</span><strong>{data.counts.contacts}</strong><span>Your connections stay accessible →</span></a><div className="card stat-card"><span className="eyebrow">REVIEWS YOU’VE WRITTEN</span><strong>{data.counts.reviews}</strong><span>Help other families choose care</span></div></div>
    <div className="dashboard-grid"><section className="card form-section"><h2>Your next steps</h2><ol className="next-steps"><li><strong>Find the right experience</strong><p>Choose a care category and work arrangement. Add location for live-out care and compare pay by month, day, or hour.</p></li><li><strong>Save your favourites</strong><p>Your shortlist is free and private. Visit a profile to read public reviews and learn about the caregiver.</p></li><li><strong>Make a connection</strong><p>A contact-access pass unlocks new contacts. Previously unlocked contacts stay available after expiry.</p></li></ol><div className="action-row"><a className="button secondary" href="/caregivers">Browse caregivers</a><a className="button secondary" href="/shortlist">My shortlist</a></div></section><aside><section className="card side-card"><span className="eyebrow">YOUR ACCOUNT</span><h3>{data.profile.name || 'Add your name'}</h3><p className="contact">{data.profile.email}</p><p>{data.profile.phone || 'Add your phone number'}</p><a className="button secondary" href="/account">Manage account</a></section><section className="card side-card"><span className="eyebrow">CONTACT ACCESS</span><h3>{data.profile.pass_active ? 'Your pass is active' : 'No active pass'}</h3>{data.profile.pass_expires_at && <p>Expiry: {new Date(data.profile.pass_expires_at).toLocaleString()}</p>}<p>Browsing and shortlisting are free. KES 300 gives 30 days of new unlocks; KES 500 gives 90 days.</p><small>M-Pesa setup and testing are scheduled for the final stage.</small></section></aside></div>
    <div className="privacy-note">Your employer account is private and never listed publicly. When you choose to write a public review, only your first name is shown.</div>
  </>
}

export function EmployerAccount({ onSaved }) {
  const { data, error: loadingError, retry } = useEmployer('/employers/profile')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const fields = new FormData(event.currentTarget)
    try {
      const result = await api('/employers/profile', { method: 'PUT', body: { name: fields.get('name'), phone: fields.get('phone') } })
      setMessage('Your account details have been saved.'); onSaved?.(result.profile)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <><div className="page-heading"><div><span className="eyebrow">JUST FOR YOU</span><h1>Your private account.</h1><p>Your name and phone are not part of a public employer profile.</p></div></div>
    {!data ? <LoadState error={loadingError} retry={retry} /> : <form className="card form-section" onSubmit={save}>{error && <div className="alert error" role="alert">{error}</div>}{message && <div className="alert" role="status">{message}</div>}<fieldset className="form-fields" disabled={busy}><label>Full name<input name="name" autoComplete="name" defaultValue={data.profile.name} maxLength={120} required /></label><label>Contact phone<input name="phone" type="tel" autoComplete="tel" defaultValue={data.profile.phone} maxLength={32} required /></label><label>Email address<input value={data.profile.email} type="email" readOnly /><small>Email changes are not supported here.</small></label></fieldset><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save account details'}</button></form>}
  </>
}

export function EmployerContacts() {
  const [page, setPage] = useState(1)
  const { data, error, retry } = useEmployer(`/employers/contacts?page=${page}`)
  return <><div className="page-heading"><div><span className="eyebrow">YOUR CONNECTIONS</span><h1>Previously unlocked contacts.</h1><p>These contacts remain available even when your contact-access pass expires.</p></div><a className="button secondary" href="/caregivers">Find more caregivers →</a></div>
    {error && <LoadState error={error} retry={retry} />}
    {!data && !error ? <p role="status">Loading contacts…</p> : data?.contacts.length === 0 ? <section className="card state-panel"><h2>No unlocked contacts yet</h2><p>Start by browsing and shortlisting caregivers. New contact unlocking requires an active pass.</p><a className="button primary" href="/caregivers">Browse caregivers</a></section> : data && <div className="caregiver-grid">{data.contacts.map(({ profile, contact, unlocked_at }) => <article className="card result-card" key={profile.id}><a href={`/caregivers/${profile.id}`}><img className="result-photo" src={profile.photo_url} alt={profile.name} loading="lazy" /><h2>{profile.name}</h2><p>{CATEGORIES[profile.service_category]}</p></a><p>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : 'Phone not provided'}</p><p className="contact"><a href={`mailto:${contact.email}`}>{contact.email}</a></p><small>Unlocked {new Date(unlocked_at).toLocaleDateString()}</small><div className="action-row"><a className="button secondary" href={`/caregivers/${profile.id}`}>Profile & reviews →</a></div></article>)}</div>}
    {data?.total > 12 && <div className="pagination"><button className="button secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / 12)}</span><button className="button secondary" disabled={page * 12 >= data.total} onClick={() => setPage(p => p + 1)}>Next</button></div>}
  </>
}
