// Public URLs are independent of the application's internal view names.
export const APP_PATHS = {
  '/caregiver': '#/join?role=caregiver', '/employer': '#/join?role=employer',
  '/register': '#/join', '/signin': '#/signin', '/caregivers': '#/browse',
  '/workspace': '#/workspace', '/identity': '#/identity', '/membership': '#/membership',
  '/shortlist': '#/shortlist', '/contacts': '#/contacts', '/account': '#/account',
  '/privacy-account': '#/privacy-account', '/tickets': '#/support',
}
export function appRoute({pathname = '/', search = '', hash = ''}) {
  if (hash.startsWith('#/')) return hash // Legacy bookmarks and email links.
  const path = pathname.replace(/\/$/, '') || '/'
  const route = APP_PATHS[path] || (/^\/caregivers\/[a-zA-Z0-9]+$/.test(path) ? `#${path}` : null)
  if (!route) return null
  const [view, defaults = ''] = route.split('?')
  const params = new URLSearchParams(search)
  // Dedicated signup pages always select their advertised role.
  for (const [key,value] of new URLSearchParams(defaults)) params.set(key,value)
  return view + (params.size ? `?${params}` : '')
}
export function appHref(route) {
  const [view, query = ''] = route.replace(/^\/app\//, '').split('?')
  const params = new URLSearchParams(query)
  if (view === '#/join') {
    const role=params.get('role');params.delete('role')
    return (role === 'caregiver' ? '/caregiver' : role === 'employer' ? '/employer' : '/register') + (params.size ? `?${params}` : '')
  }
  const path = Object.entries(APP_PATHS).find(([,value])=>value===view)?.[0] || (/^#\/caregivers\/[a-zA-Z0-9]+$/.test(view) ? view.slice(1) : null)
  if (!path) return null
  return path + (query ? `?${query}` : '')
}
export function currentAppRoute() { return appRoute(window.location) || window.location.hash }
export function navigateApp(route, {replace = false} = {}) {
  const target = route.startsWith('#/') ? appHref(route) : route
  if (!target || !target.startsWith('/') || target.startsWith('//')) throw new Error('Unknown application route')
  window.history[replace ? 'replaceState' : 'pushState']({}, '', target)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
