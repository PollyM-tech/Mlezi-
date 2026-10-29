import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'

const url = process.env.VITE_CONVEX_URL
if (!url) {
  console.error('Set VITE_CONVEX_URL in .env.local first.')
  process.exitCode = 1
} else {
  try {
    const result = await new ConvexHttpClient(url).query(makeFunctionReference('health:status'), {})
    if (result.app !== 'mlezi' || !['migration-foundation', 'authentication', 'marketplace'].includes(result.phase)) throw new Error('Unexpected deployment response.')
    console.log(`Connected to Mlezi Convex (${result.phase}).`)
    console.log('Authentication, application data and uploads use Convex only.')
    if (['authentication', 'marketplace'].includes(result.phase)) console.log(result.emailReady ? 'Email provider variables are configured.' : 'Email delivery still needs AUTH_RESEND_KEY and AUTH_EMAIL_FROM.')
    if (result.phase === 'marketplace') console.log(result.migrationImported ? 'Marketplace snapshot has been imported.' : 'Marketplace functions are ready; the existing-data import is pending.')
  } catch {
    console.error('Cannot reach the Mlezi health function. Authenticate, select the intended project, and run npm run convex:dev first.')
    process.exitCode = 1
  }
}
