import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Reviews({ profileId, user, owner = false, version = 0 }) {
  const [data, setData] = useState(null)
  const [own, setOwn] = useState(null)
  const [eligible, setEligible] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState(null)
  useEffect(() => {
    let cancelled = false
    api(`/caregivers/${profileId}/reviews?page=${page}`, { authenticated: false }).then(result => { if (!cancelled) setData(result) }).catch(err => { if (!cancelled) setError(err.message) })
    if (user?.role === 'employer') Promise.all([api(`/contact/unlock/${profileId}`), api(`/caregivers/${profileId}/review/mine`)]).then(([access, review]) => { if (!cancelled) { setEligible(access.unlocked); setOwn(review.review) } }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [profileId, user, revision, version, page])
  async function submit(event, path, body) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await api(path, { method: 'PUT', body }); setRevision(v => v + 1); setMessage('Saved successfully.'); }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function report(event, id) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api(`/reviews/${id}/report`, { method: 'POST', body: { reason: new FormData(event.currentTarget).get('reason') } }); setReporting(null); setMessage('Your report was sent for administrator review.') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <section className="card form-section reviews"><h2>Employer reviews</h2><p>{data?.review_count ? `${Number(data.rating_avg).toFixed(1)} ★ · ${data.review_count} reviews` : 'No reviews yet'}</p><small>Reviews reflect employers’ reported experiences. Contact access does not confirm employment.</small>
    {error && <div className="alert error" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
    {eligible && <form key={`${own?.id || 'new'}-${revision}`} onSubmit={event => { const fields = new FormData(event.currentTarget); submit(event, `/caregivers/${profileId}/review`, { rating: Number(fields.get('rating')), comment: fields.get('comment'), author_name: fields.get('author_name') }) }}><h3>{own ? 'Update your review' : 'Share your experience'}</h3><div className="two-columns"><label>Your first name<input name="author_name" defaultValue={own?.author_name || user?.profile?.name?.split(' ')[0] || ''} maxLength={80} required /></label><label>Rating<select name="rating" defaultValue={own?.rating || 5}>{[5,4,3,2,1].map(r => <option key={r} value={r}>{r} {'★'.repeat(r)}</option>)}</select></label></div><label>Public review<textarea name="comment" maxLength={2000} defaultValue={own?.comment || ''} required /><small>Do not include contact details or private information.</small></label><button className="button primary" disabled={busy}>{own ? 'Update review' : 'Publish review'}</button></form>}
    {data?.reviews.map(review => <article className="review-item" key={review.id}><div className="payment-row"><strong>{review.author_name} · {'★'.repeat(review.rating)}</strong><time>{new Date(review.created_at).toLocaleDateString()}</time></div><p className="preserve-lines">{review.comment}</p>{review.reply && <blockquote><strong>Caregiver reply</strong><p className="preserve-lines">{review.reply}</p></blockquote>}
      {owner && <form onSubmit={event => submit(event, `/reviews/${review.id}/reply`, { reply: new FormData(event.currentTarget).get('reply') })}><label>Your public reply<textarea name="reply" defaultValue={review.reply || ''} maxLength={2000} required /></label><button className="button secondary" disabled={busy}>Save reply</button></form>}
      {user && <button className="text-button" onClick={() => setReporting(reporting === review.id ? null : review.id)}>Report review</button>}
      {reporting === review.id && <form onSubmit={event => report(event, review.id)}><label>Reason<textarea name="reason" maxLength={1000} required /></label><button className="button secondary" disabled={busy}>Send report</button></form>}
    </article>)}
    {data?.total > 20 && <div className="pagination"><button className="button secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button className="button secondary" disabled={page*20 >= data.total} onClick={() => setPage(p => p + 1)}>Next</button></div>}
  </section>
}
