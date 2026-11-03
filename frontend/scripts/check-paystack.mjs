import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

// Read-only credential check: no checkout, customer, charge or membership writes.
async function main() {
  const fromConvex = process.argv.includes('--convex')
  let secret = process.env.PAYSTACK_SECRET_KEY
  if (fromConvex) {
    const result = spawnSync(process.execPath, [join(process.cwd(), 'node_modules/convex/bin/main.js'), 'env', 'get', 'PAYSTACK_SECRET_KEY'], { encoding: 'utf8', timeout: 45000, maxBuffer: 65536 })
    // Never print CLI output: stdout can contain the private key.
    if (result.status !== 0 || !result.stdout.trim()) throw new Error('Could not read PAYSTACK_SECRET_KEY from the selected Convex deployment. Check CLI login and deployment selection.')
    secret = result.stdout.trim()
  }
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is missing. Use --convex to read it privately from the selected Convex deployment.')
  if (!secret.startsWith('sk_test_')) throw new Error('This check accepts test secret keys only (sk_test_). No Paystack request was made.')
  const response = await fetch('https://api.paystack.co/bank?country=kenya&currency=KES&perPage=1', {
    headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000), redirect: 'error',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.status !== true) {
    const detail = response.status === 401 ? 'The test key was not accepted.' : response.status === 403 ? 'Access was denied. Check key permissions and the IP allowlist.' : 'The provider did not accept the check.'
    throw new Error(`Paystack returned HTTP ${response.status}. ${detail}`)
  }
  console.log(JSON.stringify({ testCredentialsAccepted: true, keySource: fromConvex ? 'selected Convex deployment' : 'local environment', requestExecutedFrom: 'local machine', kenyaKESBankLookupPassed: Array.isArray(body.data), paymentCreated: false, membershipChanged: false }, null, 2))
  console.log('Credential connectivity passed. Checkout, webhook verification and membership activation still need implementation and end-to-end testing.')
}
main().catch(error => { console.error(error?.name === 'TimeoutError' || error?.cause || error instanceof TypeError ? 'Unable to reach Paystack or the Convex CLI. Check connectivity and try again. No credentials were printed.' : error.message); process.exitCode = 1 })
