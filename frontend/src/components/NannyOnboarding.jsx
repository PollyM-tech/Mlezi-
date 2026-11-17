import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api as functions } from '../../convex/_generated/api.js'
import { api } from '../lib/api.js'
import { navigateApp } from '../lib/routes.js'

const labels = { photo: 'Profile photo', national_id: 'National ID image', selfie: 'Recent selfie' }
const errorText = error => error?.data?.message || (typeof error?.data === 'string' ? error.data : error?.message) || 'Unable to save. Please try again.'
function WorkDetails({ user, initial, onSaved }) {
  const save = useMutation(functions.onboarding.saveWork)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const later = event.nativeEvent.submitter?.value === 'later', values = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      await save({ work: { name: String(values.get('name')).trim(), area: String(values.get('area')).trim(), experience: Number(values.get('experience')), category: String(values.get('category')), arrangement: String(values.get('arrangement')) } })
      if (later) navigateApp('/'); else onSaved()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="card form-section onboarding-form"><h1>Tell us about your work</h1><p>Your profile stays private until you submit your identity check. You can save and return within 7 days.</p>{error && <p className="alert error" role="alert">{error}</p>}<fieldset className="form-fields" disabled={busy}>
    <label>Your name<input name="name" autoComplete="name" defaultValue={initial?.name || user.name || ''} maxLength={120} required /></label>
    <label>Your area or town<input name="area" defaultValue={initial?.area || ''} placeholder="e.g. Kilimani, Nairobi" maxLength={120} required aria-describedby="onboarding-area-help" /></label><small id="onboarding-area-help">Do not enter your exact home address.</small>
    <label>Years of experience<input name="experience" type="number" inputMode="numeric" min="0" max="80" step="1" defaultValue={initial?.experience ?? 0} required /></label>
    <label>I work as<select name="category" defaultValue={initial?.category || 'nanny'}><option value="nanny">Nanny</option><option value="babysitter">Babysitter</option></select></label>
    <label>Preferred work arrangement<select name="arrangement" defaultValue={initial?.arrangement || ''} required><option value="">Choose an arrangement</option><option value="live_in">Live-in</option><option value="live_out">Live-out / day nanny</option><option value="occasional_backup">On-call / occasional</option><option value="overnight">Overnight</option><option value="travel">Travel with a family</option></select></label>
    <p>You can add your introduction, skills, languages and expected pay later.</p>
    <div className="action-row"><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button><button className="button secondary" type="submit" value="later" disabled={busy}>Save and finish later</button></div>
  </fieldset></form>
}
export default function NannyOnboarding({ user }) {
  const draft = useQuery(functions.onboarding.current)
  const submit = useMutation(functions.onboarding.submit)
  const [step, setStep] = useState(null), [consent, setConsent] = useState(false)
  const [uploaded, setUploaded] = useState({}), [progress, setProgress] = useState({})
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [submitted, setSubmitted] = useState(false)
  if (draft === undefined) return <p role="status">Loading your saved progress…</p>
  const currentStep = step || (draft?.work ? 'identity' : 'work')
  const saved = { ...draft?.uploaded, ...uploaded }
  async function upload(kind, file) {
    if (!file) return
    if (!consent) { setError('Confirm permission before uploading your photos.'); return }
    setBusy(kind); setError(''); setProgress(p => ({ ...p, [kind]: null }))
    try {
      const body = new FormData(); body.set(kind, file); body.set('consent', 'true')
      await api('/onboarding/upload', { method: 'POST', body, onUploadProgress: percent => setProgress(p => ({ ...p, [kind]: percent })) })
      setUploaded(current => ({ ...current, [kind]: true }))
    } catch (e) { setError(errorText(e)) } finally { setBusy('') }
  }
  async function finish(event) {
    event.preventDefault(); setBusy('submit'); setError('')
    try { await submit({ consent }); setSubmitted(true); navigateApp('/workspace', { replace: true }) }
    catch (e) { setError(errorText(e)) } finally { setBusy('') }
  }
  return <section className="nanny-onboarding"><ol className="onboarding-steps" aria-label="Registration progress"><li>1. Account created</li><li aria-current={currentStep === 'work' ? 'step' : undefined}>2. Your work</li><li aria-current={currentStep === 'identity' ? 'step' : undefined}>3. Identity check</li></ol>
    {currentStep === 'work' ? <WorkDetails user={user} initial={draft?.work} onSaved={() => { setUploaded({}); setStep('identity') }} /> : <form className="card form-section onboarding-form" onSubmit={finish}><h1>Complete your identity check</h1><p>You need three clear photos: a profile photo, your National ID and a recent selfie. Your ID and selfie stay private. An administrator checks your identity and that you are at least 18.</p><p>Each successful upload is saved privately to your account. You can leave and return within 7 days; unfinished drafts and their photos are deleted after that.</p>
      {error && <p className="alert error" role="alert">{error}</p>}{submitted && <p role="status">Your identity check has been submitted. Opening your profile…</p>}
      <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={!!busy} /><span>I allow Mlezi administrators to compare my ID, selfie and profile photo for this identity check. <a href="/privacy/#privacy-identity" target="_blank" rel="noopener">How my photos are used</a></span></label>
      {Object.entries(labels).map(([kind, label]) => <section className="onboarding-upload" key={kind}><label>{label}<input name={kind} type="file" accept="image/jpeg,image/png,image/webp" disabled={!consent || !!busy || submitted} onChange={e => { upload(kind, e.target.files?.[0]); e.target.value = '' }} /></label><small>{kind === 'photo' ? 'Use a clear photo of yourself for your profile.' : kind === 'national_id' ? 'Make sure the ID details are readable.' : 'Use a recent, clear photo of your face.'} JPEG, PNG or WebP, up to 25 MB. Large images are reduced before uploading.</small>
        {busy === kind ? <div role="status"><span>{progress[kind] === null ? 'Preparing photo…' : `Uploading ${progress[kind]}%…`}</span><progress aria-label={`${label} upload progress`} max="100" value={progress[kind] ?? undefined} /></div> : saved[kind] && <p role="status">Uploaded and saved privately. You may replace it before submitting.</p>}
      </section>)}
      <p>Review normally takes about 24 hours after submission. Uploading alone does not grant an identity badge. Additional profile details are optional and can be added later.</p><div className="action-row"><button className="button primary" type="submit" disabled={!consent || !!busy || submitted || Object.keys(labels).some(kind => !saved[kind])}>{busy === 'submit' ? 'Submitting…' : 'Submit identity check'}</button><button className="button secondary" type="button" disabled={!!busy} onClick={() => navigateApp('/')}>Save and finish later</button><button className="text-button" type="button" disabled={!!busy} onClick={() => setStep('work')}>Back to work details</button></div>
    </form>}
  </section>
}
