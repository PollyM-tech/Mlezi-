// Public readiness only. This does not request an OAuth token or send an STK prompt.
const site = process.env.VITE_CONVEX_SITE_URL || process.env.VITE_CONVEX_URL?.replace(/\.convex\.cloud\/?$/, '.convex.site')
try {
  if(!site)throw new Error('Set VITE_CONVEX_URL or VITE_CONVEX_SITE_URL for the development deployment.')
  const url=new URL(site)
  if(url.protocol!=='https:'||!url.hostname.endsWith('.convex.site')||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('Use the HTTPS Convex HTTP Actions origin ending in .convex.site.')
  const response=await fetch(new URL('/health',url),{signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw new Error(`Backend health returned HTTP ${response.status}. Publish the current Convex functions first.`)
  const data=await response.json()
  if(data.app!=='mlezi')throw new Error('This backend did not identify itself as Mlezi.')
  console.log(`Backend: ${url.origin}`)
  console.log(`Callback: ${url.origin}/payments/mpesa/callback`)
  console.log(`Manual payment reporting: ${data.manualPaymentsEnabled?'enabled':'disabled'}`)
  if(!data.paymentsEnabled)throw new Error('STK is disabled or configuration is incomplete. Check the MPESA_* variables in this Convex deployment, then publish the current backend. No payment was initiated.')
  if(!['sandbox','production'].includes(data.paymentEnvironment))throw new Error('Publish the current backend to expose payment environment readiness. No payment was initiated.')
  console.log(`STK configuration: enabled (${data.paymentEnvironment})`)
  console.log(data.paymentEnvironment==='sandbox'?'Ready for an operator sandbox test. Sandbox confirmation does not activate membership.':'Live mode is configured. Starting a payment may charge real money.')
  console.log('Readiness only: credentials, callback delivery and real provider confirmation have not been tested. No payment was initiated.')
}catch(error){console.error(error.message);process.exitCode=1}
