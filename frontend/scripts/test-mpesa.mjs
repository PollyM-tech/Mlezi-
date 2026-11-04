// A single, fixed KES 5 provider test. No membership creation or activation.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { initiateProvider, queryProvider, mpesaPhone } from '../convex/lib/mpesa.js'

export function terminalSettings(env, live) {
  const environment=env.MPESA_ENVIRONMENT || 'sandbox'
  if(!['sandbox','production'].includes(environment))throw new Error('Set MPESA_ENVIRONMENT to sandbox or production.')
  if(environment==='production'&&!live)throw new Error('A live test requires the explicit --live option.')
  if(environment!=='production'&&live)throw new Error('--live requires approved production credentials, not sandbox settings.')
  const shortcode=env.MPESA_SHORTCODE
  if(!/^\d{5,10}$/.test(shortcode||''))throw new Error('Set the appropriate MPESA_SHORTCODE.')
  if(environment==='sandbox'&&shortcode==='4125123'||environment==='production'&&shortcode!=='4125123')throw new Error('Use the sandbox shortcode for sandbox, or Paybill 4125123 for the live test.')
  for(const key of ['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_PASSKEY'])if(!env[key])throw new Error(`Set ${key} in your private environment file.`)
  const site=env.CONVEX_SITE_URL||env.VITE_CONVEX_SITE_URL||env.VITE_CONVEX_URL?.replace(/\.convex\.cloud\/?$/,'.convex.site')
  const url=new URL(site||'https://invalid.test')
  if(url.protocol!=='https:'||!url.hostname.endsWith('.convex.site')||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('Set your Convex HTTP Actions origin for the callback.')
  return {environment,shortcode,callbackUrl:`${url.origin}/payments/mpesa/callback`,host:environment==='production'?'https://api.safaricom.co.ke':'https://sandbox.safaricom.co.ke'}
}
export async function runTerminalTest(args,env=process.env) {
  const send=args.includes('--send'),check=args.includes('--check'),live=args.includes('--live')
  if(send&&check)throw new Error('Choose --send or --check, not both.')
  if(args.some(a=>!['--send','--check','--live','--phone'].includes(a)&&args[args.indexOf(a)-1]!=='--phone'))throw new Error('Use only --phone NUMBER, --send, --check and --live. Amount is fixed at KES 5.')
  const settings=terminalSettings(env,live),file=resolve('.mpesa-test/payment.json')
  if(check){
    const record=JSON.parse(await readFile(file,'utf8'))
    if(record.environment!==settings.environment||record.shortcode!==settings.shortcode||record.amount!==5)throw new Error('The saved test does not match these credentials and destination.')
    if(!record.checkoutRequestId)throw new Error('No checkout ID was received. Investigate the saved attempt before sending another request.')
    if(record.state==='completed'||record.state==='failed'){console.log(`Saved result: ${record.state}. No new request sent.`);return}
    if(record.nextCheckAt>Date.now())throw new Error('Wait for the provider cooldown before checking again.')
    record.nextCheckAt=Date.now()+60000;await writeFile(file,JSON.stringify(record),{mode:0o600})
    try{
      const code=await queryProvider(settings,record)
      if(code!==null){record.state=code===0?'completed':'failed';record.resultCode=code}
      console.log(code===0?'KES 5 test confirmed. No membership was activated.':code===null?'Still awaiting a final provider result.':`Test not completed (result ${code}).`)
    }catch(error){record.nextCheckAt=Date.now()+Math.max(60000,error.retryAfterMs||60000);console.log('Provider confirmation is unavailable. Wait before checking again. No new prompt sent.')}
    await writeFile(file,JSON.stringify(record),{mode:0o600});return
  }
  const at=args.indexOf('--phone'),phone=mpesaPhone(at>=0?args[at+1]:env.MPESA_TEST_PHONE)
  console.log(`Test: KES 5; ${settings.environment}; shortcode ${settings.shortcode}; phone ending ${phone.slice(-4)}.`)
  if(!send){console.log('Preview only. Add --send to send one prompt. This does not change membership prices or backend settings.');return}
  await mkdir(dirname(file),{recursive:true,mode:0o700})
  const record={amount:5,environment:settings.environment,shortcode:settings.shortcode,state:'prepared',createdAt:Date.now(),nextCheckAt:Date.now()+60000}
  try{await writeFile(file,JSON.stringify(record),{flag:'wx',mode:0o600})}catch(error){if(error.code==='EEXIST')throw new Error('A test record already exists. Use --check and investigate its result before creating another test.');throw error}
  try{
    const result=await initiateProvider(settings,{_id:randomUUID(),amount:5,phone},{accountReference:'MLEZI5TEST',description:'Mlezi test'})
    Object.assign(record,result,{state:'pending'});await writeFile(file,JSON.stringify(record),{mode:0o600})
    console.log('One KES 5 request accepted. Confirm on your phone, then run with --check after one minute. Never enter your PIN in this terminal.')
  }catch(error){record.state=error.uncertain===false?'rejected':'unknown';await writeFile(file,JSON.stringify(record),{mode:0o600});throw new Error('The test request could not be confirmed. The attempt was saved; do not blindly resend it.')}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runTerminalTest(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1})
