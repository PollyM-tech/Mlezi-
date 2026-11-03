import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api.js'

import { ADMIN_SECTIONS } from '../lib/admin.js'
export default function AdminAlerts({ onOpen }) {
  const [clock, setClock] = useState(() => Math.floor(Date.now() / 60000))
  useEffect(() => { const timer = setInterval(() => setClock(Math.floor(Date.now() / 60000)), 60000); return () => clearInterval(timer) }, [])
  const data = useQuery(api.adminDashboard.overview, { clock })
  if (!data) return <p role="status">Loading administrator alerts…</p>
  const total = Object.entries(data.queues).filter(([key]) => key !== 'waiting').reduce((sum,[,q]) => sum + q.count, 0)
  const capped = Object.values(data.queues).some(q => q.more)
  return <section className="card form-section admin-alerts" aria-labelledby="admin-alerts-heading">
    <h2 id="admin-alerts-heading">Notifications & work queue</h2>
    <p role="status" aria-live="polite">{total}{capped ? '+' : ''} items need attention. {data.overdueTickets} support requests overdue; {data.dueSoonTickets} due within 6 hours.</p>
    <p>Updates appear automatically while this dashboard is open. Counts show up to 100 per queue; deadlines refer to the oldest loaded requests.</p>
    <div className="admin-queue-grid">{Object.entries(data.queues).map(([key,queue]) => <button type="button" className="button secondary admin-queue" key={key} onClick={() => onOpen(key === 'failedEmails' ? 'emails' : key === 'waiting' ? 'tickets' : key, null, key === 'waiting' ? 'waiting' : 'open')}><strong>{queue.count}{queue.more ? '+' : ''}</strong><span>{key === 'failedEmails' ? 'Failed support emails' : key === 'waiting' ? 'Support replied / awaiting customer' : ADMIN_SECTIONS[key]}</span></button>)}</div>
    <h3>Priority notifications</h3>{data.notifications.length ? <ul className="admin-notifications">{data.notifications.map((n,i) => <li key={`${n.section}-${n.id}-${i}`}><button type="button" className="text-button" onClick={() => onOpen(n.section, n.section === 'tickets' ? n.id : null)}><strong>{n.label}</strong> · {n.title}</button><small>{new Date(n.createdAt).toLocaleString()}{n.dueAt ? ` · Follow-up due ${new Date(n.dueAt).toLocaleString()}` : ''}</small></li>)}</ul> : <p>No outstanding notifications.</p>}
  </section>
}
