import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { supportError } from '../lib/support.js'

export default function StkPayment({plan,pending,environment,user,onRefresh}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[payment,setPayment]=useState(null)
  const current=payment?.status==='pending'?payment:pending?.id===payment?.id?null:pending
  const pendingId=current?.provider==='daraja_stk' ? current.id : null
  useEffect(()=>{
    if(!pendingId)return
    let active=true,inFlight=false,attempts=0
    const timer=setInterval(async()=>{
      if(document.hidden||inFlight)return
      if(++attempts>=36)clearInterval(timer)
      inFlight=true
      try{
        const result=await api(`/payments/${encodeURIComponent(pendingId)}`)
        if(!active)return
        setPayment(previous=>previous?.id===pendingId&&previous.status!=='pending'?previous:result.payment)
        if(result.payment.status!=='pending'){clearInterval(timer);onRefresh()}
      }catch{/* A read failure never retries or starts a payment. Manual status check remains available. */}
      finally{inFlight=false}
    },5000)
    return()=>{active=false;clearInterval(timer)}
  },[pendingId,onRefresh])
  async function request(path,body) {
    setBusy(true);setError('')
    try { const result=await api(path,{method:'POST',body});setPayment(result.payment);onRefresh() }
    catch(e){setError(e.data ? supportError(e) : e.message || supportError(e))}finally{setBusy(false)}
  }
  const sandbox=environment==='sandbox'
  return <section className="privacy-note" aria-label="M-Pesa STK Push">
    <h3>{sandbox?'Test M-Pesa STK Push':'Pay with M-Pesa STK Push'}</h3>
    {sandbox&&<p>Sandbox test only. This does not activate paid membership. Use Safaricom’s sandbox test details. An accepted simulation does not guarantee a prompt on your phone.</p>}
    <p>KES {plan.amount} · {plan.days} days. {sandbox ? "Use the test phone details from your Daraja simulator." : "Enter your own M-Pesa number and approve the prompt on your phone."} Never enter your M-Pesa PIN on this website.</p>
    {error&&<p role="alert">{error}</p>}
    {current?<><p role="status">{current.result_description||'Awaiting payment confirmation.'} Do not pay again while this request is pending.</p>{current.provider==='daraja_stk'&&<button className="button secondary" disabled={busy} onClick={()=>request('/payments/stk/check',{id:current.id})}>{busy?'Checking…':'Check STK payment status'}</button>}{current.provider==='daraja_stk'&&current.environment==='sandbox'&&<><p>After three minutes, you can close an unconfirmed sandbox test and try again. This closes only the test record; it does not cancel a real M-Pesa transaction.</p><button className="button secondary" disabled={busy} onClick={()=>request('/payments/stk/close-test',{id:current.id})}>Close sandbox test</button></>}<p><a href="/tickets">Get help with this payment</a></p></>:<form onSubmit={e=>{e.preventDefault();request('/payments/stk/start',{planCode:plan.code,phone:String(new FormData(e.currentTarget).get('phone'))})}}>
      <label>M-Pesa phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={user.phone||''} maxLength={32} required disabled={busy}/></label>
      <label className="checkbox-label"><input type="checkbox" required disabled={busy}/>I authorize a {sandbox?'sandbox test':'payment'} request for KES {plan.amount} to this phone.</label>
      <button className="button primary" disabled={busy}>{busy?'Sending request…':sandbox?'Send test STK request':'Send M-Pesa prompt'}</button>
    </form>}
    {payment&&payment.status!=='pending'&&<p role="status">{payment.result_description}</p>}
  </section>
}
