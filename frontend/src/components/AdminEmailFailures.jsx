import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
import { supportError } from '../lib/support.js'
export default function AdminEmailFailures({ onOpen }) {
  const data = useQuery(api.adminDashboard.failedEmails)
  const retry = useMutation(api.support.retryEmail)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function send(id) {
    setBusy(true); setError(''); setMessage('')
    try { await retry({ id }); setMessage('Email retry queued. Open the ticket to check provider acceptance.') }
    catch (err) { setError(supportError(err)) } finally { setBusy(false) }
  }
  return <section className="card form-section"><h2>Failed support emails</h2><p>Check the sender and provider configuration before retrying. Sent means accepted by the provider; it does not confirm inbox delivery.</p>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{!data ? <p role="status">Loading failed emails…</p> : !data.emails.length ? <p>No failed support emails.</p> : data.emails.map(e => <article key={e.id} className="review-item"><h3>{e.subject}</h3><p>{e.kind} · {e.attempts} attempts</p><button type="button" className="text-button" onClick={() => onOpen('tickets', e.ticketId)}>Open ticket</button><button type="button" className="button secondary" disabled={busy} onClick={() => send(e.id)}>Retry email</button></article>)}{data?.more && <p>Showing the first 50 failed emails. More appear as these are handled.</p>}</section>
}
