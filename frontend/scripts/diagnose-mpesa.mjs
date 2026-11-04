// Operator-only sandbox diagnosis. No STK initiation, record changes, or private payload output.
import { execFile } from 'node:child_process'
let stage='operator-read'
const cli=(...args)=>new Promise((resolve,reject)=>execFile(process.execPath,['node_modules/convex/bin/main.js',...args],{encoding:'utf8',timeout:30000},(error,stdout)=>error?reject(new Error('Operator query unavailable')):resolve(stdout.trim())))
const safe=value=>typeof value==='number'||typeof value==='string'&&/^[\w.-]{1,40}$/.test(value)?value:null
async function read(response){
 const text=await response.text()
 try{return JSON.parse(text)}catch{
  console.log(JSON.stringify({stage,httpStatus:response.status,contentType:response.headers.get('content-type'),responseWasJson:false,htmlResponse:/^\s*(?:<!doctype html|<html)/i.test(text)},null,2))
  throw new Error('Provider returned a non-JSON response')
 }
}
try{
 const [environment,shortcode,key,secret,passkey,raw]=await Promise.all(['MPESA_ENVIRONMENT','MPESA_SHORTCODE','MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_PASSKEY'].map(n=>cli('env','get',n)).concat([cli('data','payments','--limit','20','--format','json')]))
 stage='sandbox-guard'
 if(environment!=='sandbox'||shortcode==='4125123'||!/^\d{5,10}$/.test(shortcode))throw new Error('Use a sandbox deployment and sandbox shortcode')
 const p=JSON.parse(raw).find(p=>p.provider==='daraja_stk'&&p.environment==='sandbox'&&p.status==='pending'&&p.checkoutRequestId)
 if(!p)throw new Error('No pending sandbox request found')
 const host='https://sandbox.safaricom.co.ke'
 stage='sandbox-authorization'
 const ar=await fetch(host+'/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64')},signal:AbortSignal.timeout(20000)})
 const auth=await read(ar)
 if(!ar.ok||!auth.access_token){console.log(JSON.stringify({stage,httpStatus:ar.status,errorCode:safe(auth.errorCode)}));throw new Error('Sandbox authorization did not succeed')}
 stage='sandbox-status-query'
 const timestamp=new Date(Date.now()+3*3600000).toISOString().slice(0,19).replace(/[-:T]/g,'')
 const response=await fetch(host+'/mpesa/stkpushquery/v1/query',{method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:shortcode,Password:Buffer.from(shortcode+passkey+timestamp).toString('base64'),Timestamp:timestamp,CheckoutRequestID:p.checkoutRequestId}),signal:AbortSignal.timeout(20000)})
 const data=await read(response)
 console.log(JSON.stringify({stage,httpStatus:response.status,responseWasJson:true,resultCode:safe(data.ResultCode),responseCode:safe(data.ResponseCode),errorCode:safe(data.errorCode),checkoutIdPresent:typeof data.CheckoutRequestID==='string',checkoutIdMatches:data.CheckoutRequestID===p.checkoutRequestId,merchantIdMatches:!p.merchantRequestId||data.MerchantRequestID===p.merchantRequestId},null,2))
 if(!response.ok){process.exitCode=1;console.log(response.status===429?'Safaricom is rate limiting status queries. Wait for the provider cooldown before checking again.':'Provider status query did not succeed.')}
 console.log('No prompt sent. No payment or membership record changed.')
}catch(error){
 const permitted=['Operator query unavailable','Provider returned a non-JSON response','Use a sandbox deployment and sandbox shortcode','No pending sandbox request found','Sandbox authorization did not succeed']
 console.error(permitted.includes(error.message)?error.message:`Read-only inspection failed during ${stage}; no credential or provider payload printed.`)
 process.exitCode=1
}
