import { readFileSync } from 'node:fs'

// The hosting file is the source of truth; preview tests exercise the same rules.
export const deploymentHeaders = Object.fromEntries(
  readFileSync(new URL('./public/_headers', import.meta.url), 'utf8').split(/\n(?=\/)/)[0].split('\n')
    .filter(line => /^\s+[A-Za-z-]+:/.test(line))
    .map(line => { const index = line.indexOf(':'); return [line.slice(0, index).trim(), line.slice(index + 1).trim()] }),
)
// Local preview is HTTP. Do not upgrade LAN requests to nonexistent local TLS
// or imply that HSTS/secure-cookie checks have passed without an HTTPS host.
export const previewHeaders = { ...deploymentHeaders,
  'Content-Security-Policy': deploymentHeaders['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests\b/g, ''),
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}
delete previewHeaders['Strict-Transport-Security']
export const developmentHeaders = Object.fromEntries(Object.entries(previewHeaders).filter(([key]) => key !== 'Content-Security-Policy'))
