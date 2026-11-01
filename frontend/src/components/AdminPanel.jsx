import AdminManualPayments from './AdminManualPayments.jsx'
import { useEffect, useState } from 'react'
import AdminOperations from './AdminOperations'
import AdminIdentity from './AdminIdentity'
import { api } from '../lib/api'

export default function AdminPanel() {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    api('/admin/reports').then(data => { if (!cancelled) setReports(data.reports) }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [version])
  async function update(path, body) {
    setBusy(true); setError(''); setMessage('')
    try { await api(path, { method: 'PUT', body }); setMessage('Moderation change saved.'); setVersion(v => v + 1) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <><div className="page-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Review reports.</h1><p>Moderation changes automatically recalculate caregiver ratings.</p></div></div>{error && <div className="alert error" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
    <p><a className="button primary" href="/tickets">Manage support tickets</a></p><AdminManualPayments /><AdminOperations /><AdminIdentity /><section className="card form-section"><h2>Review visibility</h2><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); update(`/admin/reviews/${data.get('review_id')}/visibility`, { is_public: data.get('visibility') === 'public' }) }}><div className="two-columns"><label>Review ID<input name="review_id" type="text" required /></label><label>Visibility<select name="visibility"><option value="hidden">Hide abusive review</option><option value="public">Restore public review</option></select></label></div><button className="button primary" disabled={busy}>Save visibility</button></form></section>
    <section className="card form-section"><h2>Recent reports</h2>{reports.length ? reports.map(report => <article className="review-item" key={report.id}><h3>Report #{report.id} · {report.reason}</h3><p className="preserve-lines">{report.details}</p><p>Status: {report.status}</p>{report.status !== 'resolved' && <button className="button secondary" disabled={busy} onClick={() => update(`/admin/reports/${report.id}`, { status: 'resolved' })}>Mark resolved</button>}</article>) : <p>No reports yet.</p>}</section>
  </>
}
