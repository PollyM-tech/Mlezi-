import { appRoute, navigateApp } from '../lib/routes.js'
import { lazy, Suspense, useEffect, useState } from 'react'
import PublicPages from './PublicPages.jsx'
import CookieConsent from './CookieConsent.jsx'
import FaqAssistant from './FaqAssistant.jsx'
import { AUTH_STORAGE_NAMESPACE } from '../lib/signOut.js'
import { entryRoute, publicPage, siteConfig } from '../lib/public-pages.js'

const ConvexSession = lazy(() => import('./ConvexSession.jsx'))

export default function Website() {
  const [route, setRoute] = useState(() => entryRoute(window.location))
  const [keepSession, setKeepSession] = useState(() => {
    try { return Boolean(route.private || sessionStorage.getItem(`__convexAuthJWT_${AUTH_STORAGE_NAMESPACE.replace(/[^a-zA-Z0-9]/g, '')}`)) } catch { return !!route.private }
  })
  useEffect(() => { const signedOut = () => setKeepSession(false); window.addEventListener('mlezi-signed-out', signedOut); return () => window.removeEventListener('mlezi-signed-out', signedOut) }, [])
  useEffect(() => {
    const changed = () => { const next = entryRoute(window.location); setRoute(next); if (next.private) setKeepSession(true) }
    window.addEventListener('hashchange', changed)
    window.addEventListener('popstate', changed)
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('popstate', changed) }
  }, [])
  useEffect(() => {
    const follow = event => {
      const link = event.target.closest?.('a[href]')
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.hash || !(appRoute(url) || keepSession && publicPage(url.pathname))) return
      event.preventDefault(); navigateApp(url.pathname + url.search)
    }
    document.addEventListener('click', follow)
    return () => document.removeEventListener('click', follow)
  }, [keepSession])
  useEffect(() => {
    if (route.redirect) navigateApp(route.redirect, {replace:true})
    if (route.private || !route.page) {
      document.title = route.private ? 'Your account | Mlezi' : 'Page not found | Mlezi'
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
      document.querySelector('link[rel="canonical"]')?.remove()
    } else {
      const config = siteConfig(import.meta.env)
      document.title = route.page.title
      document.querySelector('meta[name="robots"]')?.setAttribute('content', config.indexable && config.origin === window.location.origin ? 'index, follow' : 'noindex, nofollow')
      if (config.origin) {
        let canonical = document.querySelector('link[rel="canonical"]')
        if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
        canonical.href = config.origin + route.page.path
      }
    }
  }, [route])
  if (route.redirect) return <p role="status">Opening Mlezi…</p>
  if (route.private || keepSession) return <><Suspense fallback={route.private ? <p role="status">Opening your account…</p> : <PublicPages page={route.page} checkingSession />}><ConvexSession publicRoute={!route.private} publicPage={route.page} /></Suspense><FaqAssistant /></>
  return <><PublicPages page={route.page} /><CookieConsent /><FaqAssistant /></>
}

