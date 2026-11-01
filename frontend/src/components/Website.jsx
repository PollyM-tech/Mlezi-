import { appRoute, navigateApp } from '../lib/routes.js'
import { lazy, Suspense, useEffect, useState } from 'react'
import PublicPages from './PublicPages.jsx'
import CookieConsent from './CookieConsent.jsx'
import FaqAssistant from './FaqAssistant.jsx'
import { entryRoute } from '../lib/public-pages.js'

const ConvexSession = lazy(() => import('./ConvexSession.jsx'))

export default function Website() {
  const [route, setRoute] = useState(() => entryRoute(window.location))
  useEffect(() => {
    const changed = () => setRoute(entryRoute(window.location))
    window.addEventListener('hashchange', changed)
    window.addEventListener('popstate', changed)
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('popstate', changed) }
  }, [])
  useEffect(() => {
    const follow = event => {
      const link = event.target.closest?.('a[href]')
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.hash || !appRoute(url)) return
      event.preventDefault(); navigateApp(url.pathname + url.search)
    }
    document.addEventListener('click', follow)
    return () => document.removeEventListener('click', follow)
  }, [])
  useEffect(() => {
    if (route.redirect) navigateApp(route.redirect, {replace:true})
    if (route.private || !route.page) {
      document.title = route.private ? 'Your account | Mlezi' : 'Page not found | Mlezi'
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
      document.querySelector('link[rel="canonical"]')?.remove()
    }
  }, [route])
  if (route.redirect) return <p role="status">Opening Mlezi…</p>
  if (route.private) return <><Suspense fallback={<p role="status">Opening your account…</p>}><ConvexSession /></Suspense><FaqAssistant /></>
  return <><PublicPages page={route.page} /><CookieConsent /><FaqAssistant /></>
}

