// Inspect public assets only: no sign-in, cookies or application mutations.
async function read(url) {
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Could not read public asset (HTTP ${response.status}).`)
  return response.text()
}
async function main() {
  const origin = new URL(process.argv[2] || 'https://mlezicare.com')
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('Provide a public website origin.')
  const html = await read(new URL('/caregivers', origin))
  const entryPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1]
  if (!entryPath) throw new Error('Could not find the application entry script.')
  const entry = new URL(entryPath, origin)
  const mainScript = await read(entry)
  const path = mainScript.match(/(?:\.\/|\/assets\/)?ConvexSession-[A-Za-z0-9_-]+\.js/)?.[0]
  if (!path) throw new Error('Could not locate the deployed session module.')
  const session = new URL(path, entry), script = await read(session)
  const legacyRefresh = /setInterval\([^;]{0,500}(?:3e4|30000)/.test(script)
  console.log(JSON.stringify({ website: origin.origin, entryAsset: entry.pathname, sessionAsset: session.pathname, oldThirtySecondSessionTimer: legacyRefresh }, null, 2))
  if (legacyRefresh) throw new Error('The website is still serving the old 30-second session refresh. Deploy the updated frontend source; redeploying an older Git commit will retain this bug.')
  console.log('The old 30-second session timer is absent from the deployed session bundle. Verify the form journey too.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
