import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { deploymentHeaders, previewHeaders } from '../security-headers.mjs'

test('hosted and local preview keep the same script, framing and content protections', () => {
  assert.match(deploymentHeaders['Content-Security-Policy'], /frame-ancestors 'none'/)
  assert.match(deploymentHeaders['Content-Security-Policy'], /object-src 'none'/)
  assert.match(previewHeaders['Content-Security-Policy'], /script-src 'self'/)
  assert.equal(previewHeaders['X-Frame-Options'], 'DENY')
  assert.equal(previewHeaders['X-Content-Type-Options'], 'nosniff')
  assert.equal(previewHeaders['Strict-Transport-Security'], undefined)
  assert.equal(previewHeaders['Content-Security-Policy'].includes('upgrade-insecure-requests'), false)
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const headers = Object.fromEntries(vercel.headers[0].headers.map(h => [h.key, h.value]))
  assert.deepEqual(headers, deploymentHeaders)
})
test('public build assets contain no environment files, keys or private backup directories', () => {
  // Public files bypass Vite's fs.deny; inspect this upload surface separately.
  function inspect(url) {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false, 'Public assets must not symlink to private files')
      assert.doesNotMatch(entry.name, /^\.env(?:\.|$)|^\.backups$|^private-exports$|\.(?:pem|key|p12|pfx|db|sqlite3?|tar|gz|zip)$/i)
      if (entry.isDirectory()) inspect(new URL(entry.name + '/', url))
    }
  }
  inspect(new URL('../public/', import.meta.url))
})
