import { bytes64 } from './security.js'
export function mpesaSettings() {
  const environment = process.env.MPESA_ENVIRONMENT
  const shortcode = process.env.MPESA_SHORTCODE
  const required = ['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_PASSKEY']
  const site = process.env.CONVEX_SITE_URL
  const enabled = process.env.MPESA_ENABLED === 'true' && ['sandbox','production'].includes(environment)
    && /^\d{5,10}$/.test(shortcode || '') && required.every(key => !!process.env[key]) && /^https:\/\/[^/]+\.convex\.site$/.test(site || '')
    && (environment !== 'sandbox' || shortcode !== '4125123')
    && (environment !== 'production' || process.env.MPESA_LIVE_APPROVED === 'true' && shortcode === '4125123' && /^https:\/\//.test(process.env.SITE_URL || ''))
  return { enabled: !!enabled, environment: environment || 'sandbox', shortcode, callbackUrl: site ? `${site}/payments/mpesa/callback` : null,
    host: environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke' }
}
export function mpesaPhone(value) {
  if (typeof value !== 'string') throw new Error('Enter a valid Kenyan M-Pesa phone number')
  let number = value.replace(/[\s()+-]/g,'')
  if (/^0[17]\d{8}$/.test(number)) number = '254' + number.slice(1)
  if (!/^254[17]\d{8}$/.test(number)) throw new Error('Enter a valid Kenyan M-Pesa phone number')
  return number
}
export class ProviderError extends Error {
  constructor(uncertain = true) { super(uncertain ? 'Payment confirmation is delayed. Check its status before paying again.' : 'M-Pesa could not start this request. Please try again later.'); this.uncertain = uncertain }
}
async function json(url, options, initiation = false) {
  let response
  try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) }) } catch { throw new ProviderError(true) }
  if (!response.ok) throw new ProviderError(!(initiation && [400,401,403].includes(response.status)))
  try { const data = await response.json(); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data } catch { throw new ProviderError(true) }
}
async function credentials(settings) {
  let data
  try { data = await json(`${settings.host}/oauth/v1/generate?grant_type=client_credentials`, { method:'GET', headers:{ Authorization:`Basic ${bytes64(new TextEncoder().encode(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`))}` } }) } catch { throw new ProviderError(false) }
  if (typeof data.access_token !== 'string' || !data.access_token) throw new ProviderError(false)
  const timestamp = new Date(Date.now()+3*3600000).toISOString().slice(0,19).replace(/[-:T]/g,'')
  return { headers:{ Authorization:`Bearer ${data.access_token}`,'Content-Type':'application/json' }, body:{ BusinessShortCode:settings.shortcode, Password:bytes64(new TextEncoder().encode(`${settings.shortcode}${process.env.MPESA_PASSKEY}${timestamp}`)), Timestamp:timestamp } }
}
export async function initiateProvider(settings, payment) {
  const auth = await credentials(settings)
  const body = { ...auth.body, TransactionType:'CustomerPayBillOnline', Amount:payment.amount, PartyA:payment.phone, PartyB:settings.shortcode,
    PhoneNumber:payment.phone, CallBackURL:settings.callbackUrl, AccountReference:`MZ${payment._id.slice(-10)}`, TransactionDesc:'Mlezi membership' }
  const result = await json(`${settings.host}/mpesa/stkpush/v1/processrequest`, { method:'POST', headers:auth.headers, body:JSON.stringify(body) }, true)
  if (String(result.ResponseCode) !== '0') throw new ProviderError(false)
  if (typeof result.CheckoutRequestID !== 'string' || !result.CheckoutRequestID || result.CheckoutRequestID.length > 128) throw new ProviderError(true)
  return { checkoutRequestId:result.CheckoutRequestID, ...(typeof result.MerchantRequestID === 'string' ? {merchantRequestId:result.MerchantRequestID} : {}) }
}
export async function queryProvider(settings,payment) {
  const auth = await credentials(settings)
  const result = await json(`${settings.host}/mpesa/stkpushquery/v1/query`, { method:'POST',headers:auth.headers,body:JSON.stringify({...auth.body,CheckoutRequestID:payment.checkoutRequestId}) })
  if (result.CheckoutRequestID !== payment.checkoutRequestId || payment.merchantRequestId && result.MerchantRequestID && result.MerchantRequestID !== payment.merchantRequestId) throw new ProviderError(true)
  if (result.ResultCode === undefined || result.ResultCode === null || !/^-?\d+$/.test(String(result.ResultCode))) return null
  const code = Number(result.ResultCode)
  return [4999,500001,500002].includes(code) ? null : code
}
