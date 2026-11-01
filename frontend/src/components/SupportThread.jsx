import { SUPPORT_STATUSES } from '../lib/support.js'

export default function SupportThread({ ticket, busy, onReply, onResolve, onRetryEmail }) {
  return <section className="card form-section support-thread" aria-labelledby="ticket-heading">
    <h2 id="ticket-heading">{ticket.subject}</h2><p>Reference: <code>{ticket.id}</code></p><p role="status">{SUPPORT_STATUSES[ticket.status]}</p>
    {ticket.guest && <p>Guest ticket. {ticket.guestEmail ? `Provided email (not verified): ${ticket.guestEmail}` : 'No email provided.'} Do not grant account access based on a ticket or email claim.</p>}
    {ticket.emails?.length > 0 && <section><h3>Email updates</h3><p>Provider acceptance is shown as sent; it does not confirm delivery to the inbox.</p><ul>{ticket.emails.map(email => <li key={email.id}>{email.kind}: {email.status}{email.status === 'failed' && <button className="button secondary" disabled={busy} onClick={() => onRetryEmail(email.id)}>Retry email</button>}</li>)}</ul></section>}
    {ticket.guestEmail && <p>Your support reply will also be emailed to the address provided by this visitor. Never disclose account information without verifying ownership.</p>}
    <ol className="support-messages" aria-label="Ticket conversation">{ticket.messages.map(message => <li key={message.id} className={`support-message ${message.sender}`}><strong>{message.sender === 'support' ? 'Mlezi Support' : 'Customer'}</strong><small>{new Date(message.createdAt).toLocaleString()}</small><p className="preserve-lines">{message.body}</p></li>)}</ol>
    <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; onReply(new FormData(form).get('body')).then(ok => { if (ok) form.reset() }) }}><label>Your reply<textarea name="body" maxLength={2000} required disabled={busy} /></label><p className="muted">Never send passwords, verification codes, ID images or payment PINs. A reply reopens a resolved ticket.</p><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Send reply'}</button></form>
    <button className="button secondary" disabled={busy} onClick={() => onResolve(ticket.status !== 'resolved')}>{ticket.status === 'resolved' ? 'Reopen ticket' : 'Mark resolved'}</button>
  </section>
}
