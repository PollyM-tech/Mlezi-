import AdminManualPayments from './AdminManualPayments.jsx'
import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api as functions } from '../../convex/_generated/api.js'
import AdminEmailFailures from './AdminEmailFailures.jsx'
import AdminAlerts from './AdminAlerts.jsx'
import { ADMIN_SECTIONS } from '../lib/admin.js'
import SupportInbox from './SupportInbox.jsx'
import { navigateApp } from '../lib/routes.js'
import AdminOperations from './AdminOperations'
import AdminIdentity from './AdminIdentity'
import { api } from '../lib/api'

export default function AdminPanel() {
  const reports = useQuery(functions.marketplace.read, { path: '/admin/reports', params: {} })?.reports || []
  const initialSection = new URLSearchParams(window.location.search).get('section')
  const [section, setSection] = useState(ADMIN_SECTIONS[initialSection] ? initialSection : 'overview')
  useEffect(() => { const changed = () => { const value = new URLSearchParams(window.location.search).get('section'); setSection(ADMIN_SECTIONS[value] ? value : 'overview') }; window.addEventListener('popstate', changed); return () => window.removeEventListener('popstate', changed) }, [])
  const [ticket, setTicket] = useState(null)
  const [ticketStatus, setTicketStatus] = useState('open')
  function open(next, id = null, status = 'open') { setSection(next); setTicket(id); setTicketStatus(status); navigateApp(`/admin-mlezicareaccess?section=${next}`); setError(''); setMessage('') }
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function update(path, body) {
    setBusy(true); setError(''); setMessage('')
    try { await api(path, { method: 'PUT', body }); setMessage('Moderation change saved.') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <><div className="page-heading"><div><span className="eyebrow">MLEZI ADMINISTRATION</span><h1>Keep care running.</h1><p>Review identity evidence, help customers and manage account safety. All administrative actions require an authenticator-confirmed session.</p></div></div>
    <nav className="admin-tabs" aria-label="Administration sections">{Object.entries(ADMIN_SECTIONS).map(([key,label]) => <button className="button secondary" type="button" aria-pressed={section === key} key={key} onClick={() => open(key)}>{label}</button>)}</nav>
    {error && <div className="alert error" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
    <AdminAlerts onOpen={open} />
    {section === 'overview' && <section className="card form-section"><h2>Your administration desk</h2><p>Start with urgent safety reports and overdue support tickets, then review identity submissions and payment reports. Notifications clear as the underlying work is handled.</p><p>Identity checking means manually comparing a legible ID, a recent selfie and the profile photo, and confirming an age of at least 18. Premium payment never grants identity approval.</p><p>Use the sections above to reply to tickets, resolve issues, approve identity checks, compare manual receipts, suspend unsafe accounts and handle privacy requests. Security events are available under Accounts & privacy.</p></section>}
    {section === 'tickets' && <SupportInbox key={`${ticket || 'queue'}-${ticketStatus}`} admin initialTicket={ticket} initialStatus={ticketStatus} />}
    {section === 'emails' && <AdminEmailFailures onOpen={open} />}
    {section === 'payments' && <AdminManualPayments />}
    {section === 'operations' && <AdminOperations />}
    {section === 'identity' && <AdminIdentity />}
    {section === 'reports' && <><section className="card form-section"><h2>Review visibility</h2><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); update(`/admin/reviews/${data.get('review_id')}/visibility`, { is_public: data.get('visibility') === 'public' }) }}><div className="two-columns"><label>Review ID<input name="review_id" type="text" required /></label><label>Visibility<select name="visibility"><option value="hidden">Hide abusive review</option><option value="public">Restore public review</option></select></label></div><button className="button primary" disabled={busy}>Save visibility</button></form></section>
    <section className="card form-section"><h2>Safety reports</h2>{reports.length ? reports.map(report => <article className="review-item" key={report.id}><h3>Report #{report.id} · {report.reason}</h3><p className="preserve-lines">{report.details}</p><p>Status: {report.status}</p>{report.status !== 'resolved' && <button className="button secondary" disabled={busy} onClick={() => update(`/admin/reports/${report.id}`, { status: 'resolved' })}>Mark resolved</button>}</article>) : <p>No reports yet.</p>}</section></>}
  </>
}
