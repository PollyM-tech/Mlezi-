import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function AdminIdentity() {
  const [items, setItems] = useState([])
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => { let active = true; api('/admin/verification').then(data => { if (active) setItems(data.submissions) }).catch(err => { if (active) setError(err.message) }); return () => { active = false } }, [version])
  useEffect(() => {
    if (!docs) return
    const release = () => { for (const value of [docs.national_id, docs.selfie]) if (value?.startsWith('blob:')) URL.revokeObjectURL(value) }
    const timer = setTimeout(() => { release(); setDocs(null) }, 60000)
    return () => { clearTimeout(timer); release() }
  }, [docs])
  async function open(id) { setError(''); setBusy(true); try { const result = await api(`/admin/verification/${id}/documents`); setDocs({ id, ...result.documents }) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  async function review(event, id) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const action = event.nativeEvent.submitter.value
    try { await api(`/admin/verification/${id}/${action}`, { method: 'POST', body: { identity_compared: form.has('compared'), id_legible: form.has('legible'), adult_confirmed: form.has('adult'), birth_date: form.get('birth_date'), reason: form.get('reason') } }); setDocs(null); setVersion(v => v + 1) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="card form-section"><h2>Pending identity checks</h2>{error && <p role="alert">{error}</p>}{items.length === 0 && <p>No pending identity requests.</p>}{items.map(item => <article className="review-item" key={item.id}><h3>{item.name}</h3><p>Submitted {new Date(item.submitted_at).toLocaleDateString()}</p><a href={`/caregivers/${item.caregiver_id}`} target="_blank" rel="noreferrer">Open profile photo</a><p><button className="button secondary" disabled={busy} onClick={() => open(item.id)}>Open private documents</button></p>{docs?.id === item.id && <form onSubmit={event => review(event, item.id)}><p>Documents close after 60 seconds. Reopen them to continue reviewing.</p><p><a href={docs.national_id} target="_blank" rel="noreferrer">View national ID</a> · <a href={docs.selfie} target="_blank" rel="noreferrer">View selfie</a></p><label className="checkbox-label"><input name="compared" type="checkbox" />I compared the ID, selfie and profile photo and they match.</label><label className="checkbox-label"><input name="legible" type="checkbox" />The ID is legible.</label><label>Date of birth shown on the ID<input name="birth_date" type="date" /><small>Required for approval. Used to check the 18+ threshold; the full date is not stored in the profile or review record.</small></label><label className="checkbox-label"><input name="adult" type="checkbox" />I checked the date of birth on the ID and confirmed this applicant is at least 18.</label><label>Reason if rejected<textarea name="reason" maxLength="1000" /></label><button className="button primary" name="action" value="approve" disabled={busy}>Approve identity</button> <button className="button secondary" name="action" value="reject" disabled={busy}>Request correction</button></form>}</article>)}</section>
}
