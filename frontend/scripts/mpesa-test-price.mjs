import { spawnSync } from 'node:child_process'
import { TEST_ACCOUNT } from '../convex/lib/paymentPricing.js'
const flag = process.argv[2]
if (!['--enable', '--disable'].includes(flag)) {
  console.error('Usage: npm run mpesa:test-price -- --enable|--disable [--prod]')
  process.exit(1)
}
const production = process.argv.includes('--prod') ? ['--prod'] : []
function set(name, value) {
  const result = spawnSync(process.execPath, ['node_modules/convex/bin/main.js', 'env', 'set', name, value, ...production], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
if (flag === '--enable') {
  set('MPESA_TEST_PRICING_EXPIRES_AT', new Date(Date.now() + 23 * 3600000).toISOString())
  set('MPESA_TEST_PRICING_ENABLED', 'true')
  console.log(`KES 5 STK pricing enabled for ${TEST_ACCOUNT} for 23 hours. Other accounts and manual payments keep normal prices.`)
} else {
  set('MPESA_TEST_PRICING_ENABLED', 'false')
  console.log('Normal STK prices restored. Already initiated test payments can still settle.')
}
