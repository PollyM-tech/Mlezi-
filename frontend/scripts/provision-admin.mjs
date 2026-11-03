import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
// This command is deliberately separate from builds and public registration.
const flags = process.argv.slice(2).filter(value => value === '--prod')
const email = process.argv.slice(2).find(value => !value.startsWith('--'))
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: npm run convex:admin:provision -- [--prod] admin@example.com')
const cli = join(process.cwd(), 'node_modules/convex/bin/main.js')
const result = spawnSync(process.execPath, [cli, 'run', ...flags, 'adminDashboard:provision', JSON.stringify({ email })], { encoding: 'utf8', timeout: 60000 })
if (result.status !== 0) throw new Error('Administrator provisioning failed. Confirm the backend functions are deployed and the CLI selects the intended deployment. No credentials were printed.')
console.log('Administrator account reserved. At /admin-mlezicareaccess, use Forgot password to set your own password through a verified email code, then sign in and enroll your authenticator. No password was generated or printed.')
