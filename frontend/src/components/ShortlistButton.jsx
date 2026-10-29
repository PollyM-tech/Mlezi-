import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ShortlistButton({ profileId }) {
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    api('/shortlist').then(data => { if (!cancelled) { setSaved(data.profiles.some(p => p.id === profileId)); setError('') } }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [profileId, version])
  async function toggle() {
    setBusy(true); setError('')
    try { await api(`/shortlist/${profileId}`, { method: saved ? 'DELETE' : 'POST' }); setSaved(value => !value) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div>{error && <p role="alert">{error}</p>}{saved === null && error ? <button className="button secondary" onClick={() => setVersion(v => v + 1)}>Retry shortlist</button> : <button className="button secondary" disabled={busy || saved === null} onClick={toggle}>{busy ? 'Saving…' : saved ? 'Remove from shortlist' : 'Save to shortlist'}</button>}</div>
}
