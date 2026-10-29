import { useEffect, useState } from 'react'
import LegalPage from './components/LegalPage'
import PrivacyAccount from './components/PrivacyAccount'
import ConvexAuthForm from './components/ConvexAuthForm'
import ProfileForm from './components/ProfileForm'
import ProfileView from './components/ProfileView'
import IdentityCheck from './components/IdentityCheck'
import CaregiverOverview from './components/CaregiverOverview'
import Membership from './components/Membership'
import Discovery from './components/Discovery'
import AdminPanel from './components/AdminPanel'
import Landing from './components/Landing'
import CookieConsent from './components/CookieConsent'
import { EmployerDashboard, EmployerAccount, EmployerContacts } from './components/EmployerWorkspace'
import { api, clearSession, hasSession } from './lib/api'
import logo from './assets/logo.png'
import './index.css'
import './landing.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [route, setRoute] = useState(window.location.hash)
  const [reload, setReload] = useState(0)
  const routePath = route.split('?')[0]
  const routeParams = new URLSearchParams(route.split('?')[1] || '')
  const landing = ['', '#/', '#/home'].includes(routePath)
  const joining = routePath === '#/join'
  const publicId = /^#\/caregivers\/([a-zA-Z0-9]+)$/.exec(route)?.[1]
  const legal = ['#/privacy', '#/cookies', '#/terms'].includes(routePath) ? routePath.slice(2) : null
  const privacyAccount = routePath === '#/privacy-account'
  const identity = routePath === '#/identity'
  const membership = routePath === '#/membership'
  const browsing = routePath === '#/browse'
  const shortlist = routePath === '#/shortlist'
  const signin = routePath === '#/signin'
  const accountPage = routePath === '#/account'
  const contactsPage = routePath === '#/contacts'

  useEffect(() => {
    function changed() { setRoute(window.location.hash); setError(''); setNotice(''); setEditing(false); setLoading(true) }
    function expired() { setUser(null); setProfile(null); setEditing(false); setNotice('Your session has expired. Please sign in again.'); if (!['', '#/', '#/home'].includes(window.location.hash.split('?')[0])) window.location.hash = '#/signin' }
    window.addEventListener('hashchange', changed)
    window.addEventListener('mlezi-session-expired', expired)
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('mlezi-session-expired', expired) }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const account = hasSession() ? (await api('/auth/me')).user : null
        if (!active) return
        setUser(account)
        if (account && (joining || signin)) {
          window.location.hash = '#/workspace'
          return
        }
        if (publicId) {
          const data = await api(`/caregivers/${publicId}`, { authenticated: false })
          if (active) setProfile(data.profile)
        } else if (account?.role === 'caregiver' && !membership && !browsing && !landing && !joining) {
          try {
            const result = await api('/caregivers/profile')
            if (active) { setProfile(result.profile); setEditing(false) }
          } catch (err) {
            if (err.status !== 404) throw err
            if (active) { setProfile(null); setEditing(true) }
          }
        } else if (active) setProfile(null)
      } catch (err) { if (active && err.status !== 401 && !landing) setError(err.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [route, publicId, membership, browsing, shortlist, signin, accountPage, contactsPage, landing, joining, reload])

  async function logout() {
    try { await clearSession() } catch { setNotice('Unable to sign out. Please try again.'); return }
     setUser(null); setProfile(null); setError(''); setNotice('You’ve signed out. See you soon.'); setEditing(false)
    window.location.hash = '#/signin'
  }
  function saved(result) {
    setProfile(result); setEditing(false); setNotice(profile ? 'Your changes have been saved.' : 'Your caregiver profile is ready. Welcome to Mlezi!'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <div className="app-shell">
    <CookieConsent />
    {!landing && <header className="site-header"><a className="brand official-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi — a little care, a brighter beginning" /></a><span className="header-caption">A little care. A brighter beginning.</span><div className="header-actions"><a className="text-button" href="#/browse">Find care</a>{user ? <><span className="account-email">{user.email}</span><button className="text-button" onClick={logout}>Sign out ↗</button></> : <a className="text-button" href="#/signin">Sign in / join</a>}</div></header>}
    {user && !landing && <nav className="workspace-nav" aria-label="Workspace navigation"><a href="#/workspace">{user.role === 'caregiver' ? 'My profile' : 'Overview'}</a>{user.role === 'caregiver' && !publicId && profile && !membership && !identity && !browsing && !shortlist && <button className={editing ? 'active' : ''} onClick={() => { setEditing(true); setNotice('') }} disabled={loading}>Edit profile</button>}{user.role === 'caregiver' && profile && !publicId && <a href={`#/caregivers/${profile.id}`}>Public preview ↗</a>}{user.role === 'employer' && <><a href="#/browse">Find caregivers</a><a href="#/shortlist">My shortlist</a><a href="#/contacts">My contacts</a><a href="#/account">My account</a></>}{user.role !== 'admin' && <a href="#/membership">{user.role === 'caregiver' ? 'Premium membership' : 'Contact-access pass'}</a>}<a href="#/privacy-account">Privacy and account</a><span>{user.role.toUpperCase()} WORKSPACE</span></nav>}
    <main id="main-content" className={landing ? 'landing-main' : undefined}>
      {notice && <div className="alert success" role="status">{notice}<button className="dismiss" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
      {legal ? <LegalPage type={legal} /> : landing ? <Landing user={user} /> : loading ? <section className="card state-panel" role="status"><div className="spinner" /><h2>Getting things ready…</h2><p>Loading your Mlezi workspace.</p></section>
        : error ? <section className="card state-panel"><h2>We couldn’t load this page</h2><p role="alert">{error}</p><button className="button primary" onClick={() => { setError(''); setLoading(true); setReload(v => v + 1) }}>Try again</button></section>
        : publicId && profile ? <ProfileView key={profile.id} profile={profile} user={user} />
        : browsing ? <Discovery key={route} user={user} initialFilters={Object.fromEntries(routeParams)} />
        : !user ? <ConvexAuthForm key={route} initialRegistering={joining} initialRole={routeParams.get('role') === 'employer' ? 'employer' : 'caregiver'} />
        : privacyAccount ? <PrivacyAccount />
        : membership ? <Membership key={user.id} user={user} />
        : user.role === 'employer' && accountPage ? <EmployerAccount onSaved={updated => setUser(current => ({ ...current, phone: updated.phone, profile: { ...current.profile, name: updated.name } }))} />
        : user.role === 'employer' && contactsPage ? <EmployerContacts />
        : user.role === 'employer' && shortlist ? <Discovery key="saved" user={user} saved />
        : user.role === 'employer' ? <EmployerDashboard />
        : user.role === 'caregiver' && identity ? <IdentityCheck profile={profile} onChanged={status => setProfile(current => ({ ...current, verification_status: status }))} />
        : user.role === 'caregiver' && (editing || !profile) ? <ProfileForm key={profile?.id || 'new'} user={user} profile={profile} onSaved={saved} onCancel={() => setEditing(false)} />
        : user.role === 'caregiver' ? <><CaregiverOverview profile={profile} onUpdated={setProfile} onEdit={() => setEditing(true)} /><ProfileView key={profile.id} profile={profile} user={user} owner onEdit={() => { setEditing(true); setNotice('') }} /></>
        : <AdminPanel />}
    </main>{!landing && <footer><a className="brand official-brand footer-brand" href="/" aria-label="Mlezi home"><img src={logo} alt="Mlezi" /></a><p>Care begins with people.</p><p><a href="/privacy/">Privacy</a> · <a href="/cookies/">Cookies</a> · <a href="/terms/">Terms</a></p><span>Made for families and caregivers in Kenya</span></footer>}
  </div>
}
