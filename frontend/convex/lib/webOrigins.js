// Exact, operator-configured origins only. Local loopback aliases share a
// development server, but production never implicitly trusts localhost.
export function trustedWebOrigins(siteUrl, additional = '') {
  const site = new URL(siteUrl)
  const origins = new Set([site.origin])
  if (site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname)) {
    const alias = new URL(site.origin)
    alias.hostname = site.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
    origins.add(alias.origin)
  }
  for (const value of additional.split(',').map(item => item.trim()).filter(Boolean)) {
    try {
      const url = new URL(value)
      if ((url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password) origins.add(url.origin)
    } catch { /* Invalid allowlist entries never grant access. */ }
  }
  return origins
}
