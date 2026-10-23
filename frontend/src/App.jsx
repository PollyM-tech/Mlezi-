import { useEffect, useState } from 'react'
import AuthForm from './components/AuthForm'
import ProfileForm from './components/ProfileForm'
import ProfileView from './components/ProfileView'
import { api, clearSession, hasSession } from './lib/api'
import './index.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [route, setRoute] = useState(window.location.hash)
  const [reload, setReload] = useState(0)
  const publicId = /^#\/caregivers\/(\d+)$/.exec(route)?.[1]

  useEffect(() => {
    function changed() { setRoute(window.location.hash); setError(''); setEditing(false); setLoading(true) }
    function expired() { setUser(null); setProfile(null); setEditing(false); setNotice('Your session has expired. Please sign in again.') }
    window.addEventListener('hashchange', changed)
    window.addEventListener('mlezi-session-expired', expired)
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('mlezi-session-expired', expired) }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (publicId) {
          const data = await api(`/caregivers/${publicId}`, { authenticated: false })
          if (active) setProfile(data.profile)
        } else if (hasSession()) {
          const data = await api('/auth/me')
          if (!active) return
          setUser(data.user)
          if (data.user.role === 'caregiver') {
            try {
              const result = await api('/caregivers/profile')
              if (active) { setProfile(result.profile); setEditing(false) }
            } catch (err) {
              if (err.status !== 404) throw err
              if (active) { setProfile(null); setEditing(true) }
            }
          }
        } else if (active) { setUser(null); setProfile(null) }
      } catch (err) { if (active && err.status !== 401) setError(err.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [publicId, reload])

  function logout() {
    clearSession(); setUser(null); setProfile(null); setError(''); setNotice('You’ve signed out. See you soon.'); setEditing(false)
    window.location.hash = ''
  }
  function login(currentUser) {
    setUser(currentUser); setLoading(true); setNotice(''); setReload(value => value + 1)
  }
  function saved(result) {
    setProfile(result); setEditing(false); setNotice(profile ? 'Your changes have been saved.' : 'Your caregiver profile is ready. Welcome to Mlezi!'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#/" aria-label="Mlezi home"><span className="brand-symbol">m</span>mlezi<span className="brand-dot">.</span></a><span className="header-caption">A little care. A brighter beginning.</span><div className="header-actions">{publicId ? <a className="button secondary" href="#/">My workspace</a> : user && <><span className="account-email">{user.email}</span><button className="text-button" onClick={logout}>Sign out ↗</button></>}</div></header>
    {user && !publicId && <nav className="workspace-nav" aria-label="Caregiver navigation"><button className={!editing ? 'active' : ''} onClick={() => { setEditing(false); setNotice('') }} disabled={!profile || loading}>My profile</button><button className={editing ? 'active' : ''} onClick={() => { setEditing(true); setNotice('') }} disabled={loading}> {profile ? 'Edit profile' : 'Create profile'}</button>{profile && <a href={`#/caregivers/${profile.id}`}>Public preview ↗</a>}<span>CAREGIVER WORKSPACE</span></nav>}
    <main id="main-content">
      {notice && <div className="alert success" role="status">{notice}<button className="dismiss" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
      {loading ? <section className="card state-panel" role="status"><div className="spinner" /><h2>Getting things ready…</h2><p>Loading your Mlezi workspace.</p></section>
        : error ? <section className="card state-panel"><h2>We couldn’t load this page</h2><p role="alert">{error}</p><button className="button primary" onClick={() => { setError(''); setLoading(true); setReload(value => value + 1) }}>Try again</button></section>
        : publicId && profile ? <ProfileView profile={profile} />
        : !user ? <AuthForm onLogin={login} />
        : user.role !== 'caregiver' ? <section className="card state-panel"><h1>This is the caregiver workspace</h1><p>You’re signed in with an {user.role} account. Sign out to use a caregiver account.</p><button className="button primary" onClick={logout}>Sign out</button></section>
        : editing || !profile ? <ProfileForm key={profile?.id || 'new'} user={user} profile={profile} onSaved={saved} onCancel={() => setEditing(false)} />
        : <ProfileView profile={profile} owner onEdit={() => { setEditing(true); setNotice('') }} />}
    </main><footer><a className="brand footer-brand" href="#/">mlezi.</a><p>Care begins with people.</p><span>Made for caregivers in Kenya</span></footer>
  </div>
}
