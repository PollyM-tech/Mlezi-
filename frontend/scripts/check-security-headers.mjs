const target = process.argv[2]
let url
try { url = new URL(target); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error() }
catch { console.error('Usage: npm run security:headers -- https://your-private-test-site.example'); process.exit(1) }
if (process.argv.includes('--require-https') && url.protocol !== 'https:') {
  console.error('An HTTPS staging URL is required for this check.'); process.exit(1)
}
try {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) })
  const failures = []
  if (!response.ok) failures.push(`Homepage returned HTTP ${response.status}; use the final test-site URL.`)
  const csp = response.headers.get('content-security-policy') || ''
  for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) if (!csp.includes(directive)) failures.push(`CSP is missing ${directive}.`)
  const scripts = csp.split(';').find(value => value.trim().startsWith('script-src ')) || ''
  if (!scripts || /'unsafe-inline'|'unsafe-eval'|(?:^|\s)\*(?:\s|$)/.test(scripts)) failures.push('script-src must exist without unsafe-inline, unsafe-eval or a wildcard.')
  for (const [name, expected] of [['x-content-type-options','nosniff'],['x-frame-options','deny']]) if (response.headers.get(name)?.toLowerCase() !== expected) failures.push(`${name} must be ${expected}.`)
  if (!response.headers.get('referrer-policy')) failures.push('Referrer-Policy is missing.')
  if (!response.headers.get('permissions-policy')) failures.push('Permissions-Policy is missing.')
  if (url.protocol === 'https:' && !/max-age=[1-9]\d*/i.test(response.headers.get('strict-transport-security') || '')) failures.push('HTTPS deployment is missing HSTS.')
  if (failures.length) { console.error('Security header check failed:\n' + failures.map(value => '- ' + value).join('\n')); process.exitCode = 1 }
  else console.log('Security header checks passed for this homepage response.')
  if (url.protocol !== 'https:') console.log('Local HTTP check only: TLS, HSTS and Secure cookie behavior still require HTTPS testing.')
  console.log('This checks response headers only, not authorization, XSS resistance, cookie consent, or the complete application.')
  await response.body?.cancel()
} catch { console.error('Could not reach the test site. Start the preview or provide the final staging URL.'); process.exitCode = 1 }
