import { useState } from 'react'
import { api } from '../lib/api'
import { supportError } from '../lib/support.js'

export default function StkPayment({plan,pending,environment,user,onRefresh}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[payment,setPayment]=useState(null)
  const current=payment?.status==='pending'?payment:pending
  async function request(path,body) {
    setBusy(true);setError('')
    try { const result=await api(path,{method:'POST',body});setPayment(result.payment);onRefresh() }
    catch(e){setError(e.data ? supportError(e) : e.message || supportError(e))}finally{setBusy(false)}
  }
  const sandbox=environment==='sandbox'
  return <section className="privacy-note" aria-label="M-Pesa STK Push">
    <h3>{sandbox?'Test M-Pesa STK Push':'Pay with M-Pesa STK Push'}</h3>
    {sandbox&&<p>Sandbox test only. This does not activate paid membership. Use Safaricom’s sandbox test details.</p>}
    <p>KES {plan.amount} · {plan.days} days. Enter your own M-Pesa number and approve the prompt on your phone. Never enter your M-Pesa PIN on this website.</p>
    {error&&<p role="alert">{error}</p>}
    {current?<><p role="status">{current.result_description||'Awaiting payment confirmation.'} Do not pay again while this request is pending.</p>{current.provider==='daraja_stk'&&<button className="button secondary" disabled={busy} onClick={()=>request('/payments/stk/check',{id:current.id})}>{busy?'Checking…':'Check STK payment status'}</button>}<p><a href="/tickets">Get help with this payment</a></p></>:<form onSubmit={e=>{e.preventDefault();request('/payments/stk/start',{planCode:plan.code,phone:String(new FormData(e.currentTarget).get('phone'))})}}>
      <label>M-Pesa phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={user.phone||''} maxLength={32} required disabled={busy}/></label>
      <label className="checkbox-label"><input type="checkbox" required disabled={busy}/>I authorize a {sandbox?'sandbox test':'payment'} request for KES {plan.amount} to this phone.</label>
      <button className="button primary" disabled={busy}>{busy?'Sending request…':sandbox?'Send test STK request':'Send M-Pesa prompt'}</button>
    </form>}
    {payment&&payment.status!=='pending'&&<p role="status">{payment.result_description}</p>}
  </section>
}
