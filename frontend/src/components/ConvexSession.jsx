import { readRegistrationDraft, clearRegistrationDraft } from '../lib/registrationDraft.js'
import AdminBoundary from './AdminBoundary.jsx'
import ConvexAuthForm from './ConvexAuthForm.jsx'
import SignOutProvider from './SignOutProvider.jsx'
import { AUTH_STORAGE_NAMESPACE, createAuthStorage, useSignOut } from '../lib/signOut.js'
import { currentAppRoute, navigateApp } from '../lib/routes.js'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ConvexAuthProvider, useAuthActions, useConvexAuth } from '@convex-dev/auth/react'
import { useMutation, useQuery, useConvexAuth as useServerAuth } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
import { configureConvexSession } from '../lib/api.js'
import { getConvexClient } from '../lib/convexClient.js'
import PublicPages from './PublicPages.jsx'
import LegalPage from './LegalPage'
import SupportInbox from './SupportInbox.jsx'
import AdminSecurity from './AdminSecurity'
import ProfileForm from './ProfileForm'
import PrivacyAccount from './PrivacyAccount'
import CookieConsent from './CookieConsent'
import App from '../App.jsx'
import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'

function initialDetails(email) {
  try {
    const routeRole = new URLSearchParams(currentAppRoute().split('?')[1] || '').get('role')
    const draft = readRegistrationDraft(email)
    return { role: ['caregiver', 'employer'].includes(draft.role) ? draft.role : routeRole === 'employer' ? 'employer' : 'caregiver', phone: typeof draft.phone === 'string' ? draft.phone : '', name: typeof draft.name === 'string' ? draft.name : '' }
  } catch { return { role: 'caregiver', phone: '', name: '' } }
}

function CompleteAccount({ email }) {
  const ensureExisting = useMutation(api.accounts.ensureExisting)
  const register = useMutation(api.accounts.register)
  const signOut = useSignOut()
  const [checked, setChecked] = useState(false)
  const [details, setDetails] = useState(() => initialDetails(email))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    ensureExisting().then(() => { if (active) setChecked(true) }).catch(err => { if (active) setError(typeof err.data === 'string' ? err.data : 'Unable to load your account. Please try again.') })
    return () => { active = false }
  }, [ensureExisting])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const account = await register({ ...details, termsAccepted: new FormData(event.currentTarget).get('termsAccepted') === 'on', termsVersion: LEGAL_VERSION }); clearRegistrationDraft(email); navigateApp(account?.role === 'admin' ? '#/admin' : '#/workspace', { replace: true }) }
    catch (err) { setError(typeof err.data === 'string' ? err.data : 'Unable to save your account. Please try again.') } finally { setBusy(false) }
  }
  return <main className="card auth-card" style={{ maxWidth: 550, margin: '60px auto' }}><CookieConsent /><span className="eyebrow">EMAIL VERIFIED</span><h1>Complete your account</h1><p>Tell us how you’ll use Mlezi.</p>{error && <p role="alert">{error}</p>}{!checked ? <p role="status">Checking your account…</p> : <form onSubmit={submit}><label>I am joining as<select value={details.role} onChange={event => setDetails({ ...details, role: event.target.value })} disabled={busy}><option value="caregiver">Caregiver / nanny</option><option value="employer">Employer / parent</option></select></label><label>Your name<input value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} maxLength={120} required={details.role === 'employer'} disabled={busy} /></label><label>Contact phone<input value={details.phone} onChange={event => setDetails({ ...details, phone: event.target.value })} type="tel" autoComplete="tel" maxLength={32} required disabled={busy} /></label><label className="checkbox-label"><input name="termsAccepted" type="checkbox" required disabled={busy} />I am at least 18, agree to the <a href="/terms/" target="_blank" rel="noopener">Terms of use</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy notice</a>. Optional cookies are a separate choice.</label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Continue to my workspace'}</button></form>}<button className="text-button" onClick={() => signOut()}>Sign out</button></main>
}



function LinkReservedAdministrator() {
  const ensureExisting = useMutation(api.accounts.ensureExisting)
  const signOut = useSignOut()
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    ensureExisting().then(account => { if (active && account?.role !== 'admin') setDenied(true) }).catch(() => { if (active) setError('Unable to check administrator permissions. Reopen this page and try again.') })
    return () => { active = false }
  }, [ensureExisting])
  return <main className="card state-panel"><h1>{denied ? 'Administrator access only' : 'Checking administrator permissions'}</h1>{error ? <p role="alert">{error}</p> : denied ? <p>This account does not have administrator permission.</p> : <p role="status">Linking your verified email to the operator-provisioned account…</p>}<a href="/workspace">Return to my workspace</a><button className="text-button" onClick={() => signOut()}>Sign out</button></main>
}

function RestrictedAccount({ session }) {
  const signOut = useSignOut()
  const [privacy,setPrivacy] = useState(false)
  return <main className="app-shell"><CookieConsent /><header className="site-header"><strong>Mlezi</strong><a href="/tickets">Support</a><button className="text-button" onClick={()=>setPrivacy(value=>!value)}>Privacy and account requests</button><button className="text-button" onClick={()=>signOut()}>Sign out</button></header>{privacy?<PrivacyAccount />:session.status==='restricted'?<section className="card state-panel"><h1>Account access restricted</h1><p>Your account has a pending deletion request or has been suspended. Use privacy requests to contact an administrator.</p></section>:<><section className="card form-section"><h1>Your profile photo is required</h1><p>Complete your caregiver profile to access Mlezi. Submit your profile photo, national ID and selfie for identity review.</p></section><ProfileForm profile={session.setupProfile} user={session.account} onSaved={()=>{navigateApp('#/workspace')}} /></>}</main>
}

function SessionContent({ publicRoute = false, publicPage }) {
  const auth = useConvexAuth()
  const serverAuth = useServerAuth()
  const { signIn } = useAuthActions()
  const signOut = useSignOut()
  const [refresh, setRefresh] = useState(0)
  // Keep ordinary session subscriptions stable: changing query arguments makes
  // useQuery return undefined and would unmount every unfinished form below it.
  useEffect(() => { const refreshNow = () => setRefresh(value => value + 1); window.addEventListener('mlezi-security-required', refreshNow); return () => window.removeEventListener('mlezi-security-required', refreshNow) }, [])
  const session = useQuery(api.accounts.current, serverAuth.isAuthenticated ? { refresh } : 'skip')
  const account = session?.account
  useEffect(() => {
    if (account?.role !== 'admin' || !session?.adminExpiresAt) return
    // A deliberate security transition at MFA expiry, not a repeating page reset.
    const timer = setTimeout(() => setRefresh(value => value + 1), Math.max(0, session.adminExpiresAt - Date.now()) + 50)
    return () => clearTimeout(timer)
  }, [account?.role, session?.adminExpiresAt])
  useEffect(() => { if (account?.email) clearRegistrationDraft(account.email) }, [account?.email])
  const [route, setRoute] = useState(currentAppRoute)
  useEffect(() => { const changed = () => setRoute(currentAppRoute()); window.addEventListener('hashchange', changed); window.addEventListener('popstate', changed); return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('popstate', changed) } }, [])
  const [linkError, setLinkError] = useState('')
  const [handlingLink, setHandlingLink] = useState(false)
  const linkHandled = useRef(false)
  useLayoutEffect(() => {
    configureConvexSession({ authenticated: auth.isAuthenticated, identity: account?.id, fetchToken: forceRefreshToken => auth.fetchAccessToken({ forceRefreshToken }), signOut })
    return () => configureConvexSession(null)
  }, [auth, signOut, account?.id])
  useLayoutEffect(() => {
    if (!serverAuth.isAuthenticated || !['ready', 'profile_required', 'admin_security'].includes(session?.status) || !account) return
    const path = currentAppRoute().split('?')[0]
    if (path === '#/signin' || path === '#/join') navigateApp(account.role === 'admin' ? '#/admin' : '#/workspace', { replace: true })
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
    signIn(undefined, { code }).then(result => { if (!result.signingIn) throw new Error('Invalid link'); navigateApp('#/workspace') })
      .catch(() => setLinkError('This sign-in link is invalid or expired. Please request a new link or email code.'))
      .finally(() => setHandlingLink(false))
  }, [auth.isLoading, signIn])
  if (publicRoute) return <><PublicPages page={publicPage} user={auth.isAuthenticated && session?.status !== 'expired' ? account || { role: 'pending' } : null} checkingSession={auth.isLoading || serverAuth.isLoading} onSignOut={signOut} /><CookieConsent /></>
  if (['#/privacy', '#/cookies', '#/terms'].includes(route.split('?')[0])) return <><CookieConsent /><LegalPage type={route.slice(2)} /></>
  if (linkError) return <main className="card state-panel"><h1>We couldn’t sign you in</h1><p role="alert">{linkError}</p><button className="button primary" onClick={() => { setLinkError(''); navigateApp('#/signin') }}>Back to sign in</button></main>
  if (auth.isLoading || serverAuth.isLoading || handlingLink || auth.isAuthenticated && (!serverAuth.isAuthenticated || session === undefined)) return <main className="card state-panel" role="status">Checking your sign-in…</main>
  const adminEntry = route.split('?')[0] === '#/admin'
  if (adminEntry && !auth.isAuthenticated) return <main className="app-shell"><CookieConsent /><a href="/">← Mlezi home</a><ConvexAuthForm adminOnly /></main>
  if (adminEntry && auth.isAuthenticated && session?.status === 'onboarding') return <LinkReservedAdministrator />
  if (adminEntry && auth.isAuthenticated && session?.status !== 'expired' && account?.role !== 'admin') return <main className="card state-panel"><h1>Administrator access only</h1><p>This account does not have administrator permission.</p><a href="/workspace">Return to my workspace</a><button className="text-button" onClick={() => signOut()}>Sign out</button></main>
  if (auth.isAuthenticated && session?.status === 'expired') return <main className="card state-panel"><h1>Please sign in again</h1><p>Your session has expired or is no longer valid.</p><button className="button primary" onClick={() => signOut()}>Return to homepage</button></main>
  if (auth.isAuthenticated && session?.status === 'admin_security') return <AdminSecurity />
  if (auth.isAuthenticated && session?.account && route.split('?')[0] === '#/support') return <main className="app-shell"><CookieConsent /><header className="site-header"><a href="/workspace">← My account</a><button className="text-button" onClick={() => signOut()}>Sign out</button></header>{session.account.role === 'admin' ? <AdminBoundary><SupportInbox admin /></AdminBoundary> : <SupportInbox />}</main>
  if (auth.isAuthenticated && ['restricted', 'profile_required'].includes(session?.status)) return <RestrictedAccount session={session} />
  if (auth.isAuthenticated && session?.status === 'onboarding') return <CompleteAccount email={session.email} />
  return account?.role === 'admin' ? <AdminBoundary><App key={account.id} /></AdminBoundary> : <App key={account?.id || 'signed-out'} />
}

export default function ConvexSession({ publicRoute = false, publicPage }) {
  const [storage] = useState(createAuthStorage)
  if (!import.meta.env.VITE_CONVEX_URL && publicRoute) return <><PublicPages page={publicPage} /><CookieConsent /></>
  if (!import.meta.env.VITE_CONVEX_URL) return <main className="card state-panel"><h1>Account service needs configuration</h1><p>Set the public VITE_CONVEX_URL in the website environment, then restart or rebuild the website.</p><a href="/">Return home</a></main>
  return <ConvexAuthProvider client={getConvexClient()} storage={storage} storageNamespace={AUTH_STORAGE_NAMESPACE} shouldHandleCode={false}><SignOutProvider storage={storage}><SessionContent publicRoute={publicRoute} publicPage={publicPage} /></SignOutProvider></ConvexAuthProvider>
}
