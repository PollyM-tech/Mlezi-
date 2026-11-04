import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api as functions } from '../../convex/_generated/api.js'
import { api } from '../lib/api'
import { supportError } from '../lib/support.js'

export default function StkPayment({plan,pending,environment,user,onRefresh}) {
  const closeTest=useMutation(functions.mpesa.closeSandboxTest)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[payment,setPayment]=useState(null)
  const candidate=payment?.status==='pending'?payment:pending?.id===payment?.id?null:pending
  const current=candidate?.environment==='sandbox'&&environment==='production'?null:candidate
  const pendingId=current?.provider==='daraja_stk' ? current.id : null
  useEffect(()=>{
    if(!pendingId)return
    let active=true,inFlight=false,finished=false
    const refreshStatus=async()=>{
      if(!active||finished||document.hidden||inFlight)return
      inFlight=true
      try{
        const result=await api(`/payments/${encodeURIComponent(pendingId)}`)
        if(!active)return
        setPayment(previous=>previous?.id===pendingId&&previous.status!=='pending'?previous:result.payment)
        if(result.payment.status!=='pending'){finished=true;clearInterval(timer);onRefresh(result.payment)}
      }catch{/* Read failures retry automatically; they never resend a payment. */}
      finally{inFlight=false}
    }
    const timer=setInterval(refreshStatus,5000)
    document.addEventListener('visibilitychange',refreshStatus)
    window.addEventListener('focus',refreshStatus)
    return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',refreshStatus);window.removeEventListener('focus',refreshStatus)}
  },[pendingId,onRefresh])
  async function request(path,body) {
    setBusy(true);setError('')
    try { const result=await api(path,{method:'POST',body});setPayment(result.payment);onRefresh(result.payment) }
    catch(e){setError(e.data ? supportError(e) : e.message || supportError(e))}finally{setBusy(false)}
  }
  const sandbox=environment==='sandbox'
  return <section className="privacy-note" aria-label="M-Pesa STK Push">
    <h3>{sandbox?'Test M-Pesa STK Push':'Pay with M-Pesa STK Push'}</h3>
    {sandbox&&<p>Sandbox test only. This does not activate paid membership. Use Safaricom’s sandbox test details. An accepted simulation does not guarantee a prompt on your phone.</p>}
    <p>{plan.amount !== plan.standardAmount && plan.amount === 5 ? "Temporary account test price. " : ""}KES {plan.amount} · {plan.days} days. {sandbox ? "Use the test phone details from your Daraja simulator." : "Enter your own M-Pesa number and approve the prompt on your phone."} Never enter your M-Pesa PIN on this website.</p>
    {error&&<p role="alert">{error}</p>}
    {current&&<><p role="status">{current.result_description||'Awaiting payment confirmation.'} Do not pay again while this request is pending.</p></>}
    {current?.environment==='sandbox'&&<button type="button" className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const result=await closeTest({id:current.id});setPayment(result.payment);onRefresh(result.payment)}catch(e){setError(e.data?.message||e.data||e.message)}finally{setBusy(false)}}}>Reset sandbox test</button>}
    <form onSubmit={e=>{e.preventDefault();if(current||busy)return;request('/payments/stk/start',{planCode:plan.code,phone:String(new FormData(e.currentTarget).get('phone'))})}}>
      <label>M-Pesa phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={user.phone||''} maxLength={32} required disabled={busy || !!current}/></label>
      <label className="checkbox-label"><input type="checkbox" required disabled={busy || !!current}/>I authorize a {sandbox?'sandbox test':'payment'} request for KES {plan.amount} to this phone.</label>
      <button className="button primary" disabled={busy || !!current}>{busy?'Sending request…':sandbox?'Send test STK request':'Send payment request'}</button>
    </form>
    {payment&&payment.status!=='pending'&&<p role="status">{payment.result_description}</p>}
  </section>
}
