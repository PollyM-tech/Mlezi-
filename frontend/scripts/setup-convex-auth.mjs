import { generateKeyPairSync } from 'node:crypto'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const env = readFileSync('.env.local', 'utf8')
if (!/^CONVEX_DEPLOYMENT=dev:tidy-perch-115(?:\s|$)/m.test(env)) throw new Error('Select the intended Mlezi development deployment first.')
const cli = join(process.cwd(), 'node_modules/convex/bin/main.js')
function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 60000 })
  if (result.status !== 0) throw new Error('Convex configuration failed. Check CLI login and network access. No credentials were printed.')
  return result.stdout
}
const names = run(['env', 'list'])
const hasPrivate = /\bJWT_PRIVATE_KEY\b/.test(names), hasPublic = /\bJWKS\b/.test(names)
if (hasPrivate !== hasPublic) throw new Error('Only one signing-key variable exists. Resolve this in the Convex dashboard; existing keys were preserved.')
const directory = mkdtempSync(join(tmpdir(), 'mlezi-convex-auth-'))
try {
  const fields = []
  if (!hasPrivate) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    fields.push(`JWT_PRIVATE_KEY="${privateKey.export({ type: 'pkcs8', format: 'pem' }).trimEnd().replace(/\n/g, ' ')}"`)
    fields.push(`JWKS=${JSON.stringify({ keys: [{ use: 'sig', ...publicKey.export({ format: 'jwk' }) }] })}`)
  }
  if (!/\bSITE_URL\b/.test(names)) fields.push('SITE_URL=http://localhost:5173')
  if (fields.length) {
    const path = join(directory, 'auth.env')
    writeFileSync(path, fields.join('\n') + '\n', { mode: 0o600 })
    run(['env', 'set', '--from-file', path])
  }
  console.log('Development auth signing keys and site URL are configured; existing values were preserved.')
  console.log('Email setup still requires AUTH_RESEND_KEY and AUTH_EMAIL_FROM in the Convex dashboard.')
} finally { rmSync(directory, { recursive: true, force: true }) }
