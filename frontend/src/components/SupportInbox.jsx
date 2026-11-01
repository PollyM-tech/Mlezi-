import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
import SupportThread from './SupportThread.jsx'
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES, supportError } from '../lib/support.js'

export default function SupportInbox({ admin = false }) {
  const [selected, setSelected] = useState(null), [status, setStatus] = useState('open'), [cursor, setCursor] = useState(undefined)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const list = useQuery(api.support.list, { admin, ...(admin ? { status } : {}), ...(cursor ? { cursor } : {}) })
  const ticket = useQuery(api.support.thread, selected ? { id: selected } : 'skip')
  const create = useMutation(api.support.create), reply = useMutation(api.support.reply), resolve = useMutation(api.support.resolve)
  async function run(fn) {
    setBusy(true); setError(''); setMessage('')
    try { await fn(); return true } catch (err) { setError(supportError(err)); return false } finally { setBusy(false) }
  }
  return <div className="support-inbox"><div className="page-heading"><div><span className="eyebrow">MLEZI SUPPORT</span><h1>{admin ? 'Support tickets' : 'How can we help?'}</h1><p>{admin ? 'Reply privately as Mlezi Support. Your personal contact information is not shown.' : 'Open a private ticket and return here for replies. No personal contact with the operator is needed.'}</p></div></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!admin && <form className="card form-section" onSubmit={event => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form); run(async () => { const result = await create({ subject: data.get('subject'), category: data.get('category'), body: data.get('body') }); setSelected(result.id); setCursor(undefined); setMessage('Ticket created. Return here to check for replies.'); form.reset() }) }}><h2>Open a ticket</h2><label>Issue category<select name="category">{Object.entries(SUPPORT_CATEGORIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Subject<input name="subject" maxLength={120} required /></label><label>What happened?<textarea name="body" maxLength={2000} required /></label><p>Describe the problem without passwords, login codes, ID documents or payment PINs. For account deletion or a data export, use <a href="#/privacy-account">Privacy and account</a>.</p><button className="button primary" disabled={busy}>Submit ticket</button></form>}
    <section className="card form-section"><h2>{admin ? 'Ticket queue' : 'My tickets'}</h2>{admin && <label>Ticket status<select value={status} onChange={event => { setStatus(event.target.value); setCursor(undefined); setSelected(null) }}>{Object.entries(SUPPORT_STATUSES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {!list ? <p role="status">Loading tickets…</p> : !list.tickets.length ? <p>No tickets in this view.</p> : <ul className="support-ticket-list">{list.tickets.map(t => <li key={t.id}><button className="text-button" onClick={() => { setSelected(t.id); setError(''); setMessage('') }} aria-pressed={selected === t.id}>{t.subject}</button><span>{SUPPORT_STATUSES[t.status]}</span></li>)}</ul>}
      <div className="action-row">{cursor && <button className="button secondary" onClick={() => setCursor(undefined)}>Newest tickets</button>}{list?.cursor && <button className="button secondary" onClick={() => setCursor(list.cursor)}>Older tickets</button>}</div>
    </section>
    {selected && (ticket ? <SupportThread ticket={ticket} busy={busy} onReply={body => run(() => reply({ id: selected, body }))} onResolve={resolved => run(() => resolve({ id: selected, resolved }))} /> : <p role="status">Loading conversation…</p>)}
  </div>
}
