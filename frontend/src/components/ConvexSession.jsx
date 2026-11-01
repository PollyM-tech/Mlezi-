import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ConvexAuthProvider, useAuthActions, useConvexAuth } from '@convex-dev/auth/react'
import { useMutation, useQuery, useConvexAuth as useServerAuth } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
import { configureConvexSession } from '../lib/api.js'
import { getConvexClient } from '../lib/convexClient.js'
import LegalPage from './LegalPage'
import SupportInbox from './SupportInbox.jsx'
import AdminSecurity from './AdminSecurity'
import ProfileForm from './ProfileForm'
import PrivacyAccount from './PrivacyAccount'
import CookieConsent from './CookieConsent'
import App from '../App.jsx'

function initialDetails() {
  try {
    const draft = JSON.parse(sessionStorage.getItem('mlezi-registration-draft') || '{}')
    return { role: draft.role === 'employer' ? 'employer' : 'caregiver', phone: typeof draft.phone === 'string' ? draft.phone : '', name: typeof draft.name === 'string' ? draft.name : '' }
  } catch { return { role: 'caregiver', phone: '', name: '' } }
}

function CompleteAccount() {
  const ensureExisting = useMutation(api.accounts.ensureExisting)
  const register = useMutation(api.accounts.register)
  const { signOut } = useAuthActions()
  const [checked, setChecked] = useState(false)
  const [details, setDetails] = useState(initialDetails)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    ensureExisting().then(() => { if (active) setChecked(true) }).catch(err => { if (active) setError(typeof err.data === 'string' ? err.data : 'Unable to load your account. Please try again.') })
    return () => { active = false }
  }, [ensureExisting])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await register(details); sessionStorage.removeItem('mlezi-registration-draft') }
    catch (err) { setError(typeof err.data === 'string' ? err.data : 'Unable to save your account. Please try again.') } finally { setBusy(false) }
  }
  return <main className="card auth-card" style={{ maxWidth: 550, margin: '60px auto' }}><CookieConsent /><span className="eyebrow">EMAIL VERIFIED</span><h1>Complete your account</h1><p>Tell us how you’ll use Mlezi.</p>{error && <p role="alert">{error}</p>}{!checked ? <p role="status">Checking your account…</p> : <form onSubmit={submit}><label>I am joining as<select value={details.role} onChange={event => setDetails({ ...details, role: event.target.value })} disabled={busy}><option value="caregiver">Caregiver / nanny</option><option value="employer">Employer / parent</option></select></label><label>Your name<input value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} maxLength={120} required={details.role === 'employer'} disabled={busy} /></label><label>Contact phone<input value={details.phone} onChange={event => setDetails({ ...details, phone: event.target.value })} type="tel" autoComplete="tel" maxLength={32} required disabled={busy} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Continue to my workspace'}</button></form>}<button className="text-button" onClick={() => signOut()}>Sign out</button></main>
}


function RestrictedAccount({ session }) {
  const { signOut } = useAuthActions()
  const [privacy,setPrivacy] = useState(false)
  return <main className="app-shell"><CookieConsent /><header className="site-header"><strong>Mlezi</strong><a href="#/support">Support</a><button className="text-button" onClick={()=>setPrivacy(value=>!value)}>Privacy and account requests</button><button className="text-button" onClick={()=>signOut()}>Sign out</button></header>{privacy?<PrivacyAccount />:session.status==='restricted'?<section className="card state-panel"><h1>Account access restricted</h1><p>Your account has a pending deletion request or has been suspended. Use privacy requests to contact an administrator.</p></section>:<><section className="card form-section"><h1>Your profile photo is required</h1><p>Complete your caregiver profile to access Mlezi. Submit your profile photo, national ID and selfie for identity review.</p></section><ProfileForm profile={session.setupProfile} user={session.account} onSaved={()=>{window.location.hash='#/workspace'}} /></>}</main>
}

function SessionContent() {
  const auth = useConvexAuth()
  const serverAuth = useServerAuth()
  const { signIn, signOut } = useAuthActions()
  const [refresh, setRefresh] = useState(() => Math.floor(Date.now() / 60000))
  useEffect(() => { const refreshNow = () => setRefresh(Date.now()); const timer = setInterval(() => setRefresh(Math.floor(Date.now() / 60000)), 30000); window.addEventListener('mlezi-security-required', refreshNow); return () => { clearInterval(timer); window.removeEventListener('mlezi-security-required', refreshNow) } }, [])
  const session = useQuery(api.accounts.current, serverAuth.isAuthenticated ? { refresh } : 'skip')
  const account = session?.account
  const [route, setRoute] = useState(window.location.hash)
  useEffect(() => { const changed = () => setRoute(window.location.hash); window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed) }, [])
  const [linkError, setLinkError] = useState('')
  const [handlingLink, setHandlingLink] = useState(false)
  const linkHandled = useRef(false)
  useLayoutEffect(() => {
    configureConvexSession({ authenticated: auth.isAuthenticated, identity: account?.id, fetchToken: forceRefreshToken => auth.fetchAccessToken({ forceRefreshToken }), signOut })
    return () => configureConvexSession(null)
  }, [auth, signOut, account?.id])
  useLayoutEffect(() => {
    if (!serverAuth.isAuthenticated || session?.status !== 'ready' || !account) return
    const path = window.location.hash.split('?')[0]
    if (path === '#/signin' || path === '#/join') window.location.hash = '#/workspace'
  }, [serverAuth.isAuthenticated, session?.status, account])
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (!code || auth.isLoading || linkHandled.current) return
    linkHandled.current = true
    url.searchParams.delete('code')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    // Handle magic links explicitly so invalid/expired links get a visible retry path.
    Promise.resolve().then(() => setHandlingLink(true))
    signIn(undefined, { code }).then(result => { if (!result.signingIn) throw new Error('Invalid link'); window.location.hash = '#/workspace' })
      .catch(() => setLinkError('This sign-in link is invalid or expired. Please request a new link or email code.'))
      .finally(() => setHandlingLink(false))
  }, [auth.isLoading, signIn])
  if (['#/privacy', '#/cookies', '#/terms'].includes(route.split('?')[0])) return <><CookieConsent /><LegalPage type={route.slice(2)} /></>
  if (linkError) return <main className="card state-panel"><h1>We couldn’t sign you in</h1><p role="alert">{linkError}</p><button className="button primary" onClick={() => { setLinkError(''); window.location.hash = '#/signin' }}>Back to sign in</button></main>
  if (auth.isLoading || serverAuth.isLoading || handlingLink || auth.isAuthenticated && (!serverAuth.isAuthenticated || session === undefined)) return <main className="card state-panel" role="status">Checking your sign-in…</main>
  if (auth.isAuthenticated && session?.status === 'expired') return <main className="card state-panel"><h1>Please sign in again</h1><p>Your session has expired or is no longer valid.</p><button className="button primary" onClick={() => signOut()}>Back to sign in</button></main>
  if (auth.isAuthenticated && session?.status === 'admin_security') return <AdminSecurity />
  if (auth.isAuthenticated && session?.account && route.split('?')[0] === '#/support') return <main className="app-shell"><CookieConsent /><header className="site-header"><a href="#/workspace">← My account</a><button className="text-button" onClick={() => signOut()}>Sign out</button></header><SupportInbox admin={session.account.role === 'admin'} /></main>
  if (auth.isAuthenticated && ['restricted', 'profile_required'].includes(session?.status)) return <RestrictedAccount session={session} />
  if (auth.isAuthenticated && session?.status === 'onboarding') return <CompleteAccount />
  return <App key={account?.id || 'signed-out'} />
}

export default function ConvexSession() {
  return <ConvexAuthProvider client={getConvexClient()} storage={window.sessionStorage} storageNamespace="mlezi-convex-auth" shouldHandleCode={false}><SessionContent /></ConvexAuthProvider>
}
