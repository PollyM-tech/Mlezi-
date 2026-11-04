import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'

const paymentError = error => typeof error?.data === 'string' ? error.data : error?.data?.message || error?.message || 'Unable to send the payment request. Please try again.'
export default function Membership({ user }) {
  const [membership,setMembership]=useState(null),[payments,setPayments]=useState([])
  const [selected,setSelected]=useState(''),[phone,setPhone]=useState(user.phone||'')
  const [now,setNow]=useState(()=>Date.now())
  const [agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const pending=payments.find(p=>p.status==='pending'&&(membership?.payment_environment!=='production'||p.environment!=='sandbox'))
  const pendingId=pending?.id
  const refresh=useCallback(async()=>{
    const [status,history]=await Promise.all([api('/memberships'),api('/payments')])
    return {status,history}
  },[])
  useEffect(()=>{
    let active=true
    refresh().then(({status,history})=>{if(active){setMembership(status);setPayments(history.payments);setSelected(current=>current||history.payments.find(p=>p.status==='pending'&&(status.payment_environment!=='production'||p.environment!=='sandbox'))?.plan_code||status.plans[0]?.code||'')}}).catch(e=>{if(active)setError(paymentError(e))})
    return()=>{active=false}
  },[refresh])
  useEffect(()=>{
    if(!pendingId)return
    let active=true,inFlight=false,finished=false
    const readStatus=async()=>{
      if(!active||finished||inFlight||document.hidden)return
      inFlight=true
      try{
        const {payment}=await api(`/payments/${encodeURIComponent(pendingId)}`)
        if(!active)return
        setNow(Date.now())
        if(payment.status!=='pending'){
          const {status,history}=await refresh()
          if(!active)return
          finished=true;clearInterval(timer);setMessage(payment.result_description||'Payment status updated.');setAgreed(false)
          setMembership(status);setPayments(history.payments)
        }else setPayments(rows=>rows.map(p=>p.id===payment.id?payment:p))
      }catch{/* Read failures retry; no second payment is sent automatically. */}
      finally{inFlight=false}
    }
    const timer=setInterval(readStatus,5000)
    window.addEventListener('focus',readStatus);document.addEventListener('visibilitychange',readStatus)
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',readStatus);document.removeEventListener('visibilitychange',readStatus)}
  },[pendingId,refresh])
  const plan=membership?.plans.find(p=>p.code===selected)||membership?.plans[0]
  const sandbox=membership?.payment_environment==='sandbox'
  const retrySandbox=!!pending&&sandbox&&pending.environment==='sandbox'&&Date.parse(pending.created_at)<=now-180000
  const waiting=!!pending&&!retrySandbox
  async function send(event){
    event.preventDefault()
    if(!agreed){setError('Please read and agree to the Terms of Service.');return}
    setBusy(true);setError('');setMessage('')
    try{
      const {payment}=await api('/payments/stk/start',{method:'POST',body:{planCode:plan.code,phone,termsAccepted:true,termsVersion:LEGAL_VERSION,...(retrySandbox?{replaceSandbox:true}:{})}})
      setPayments(rows=>[payment,...rows.filter(p=>p.id!==payment.id).map(p=>retrySandbox&&p.id===pending.id?{...p,status:'failed'}:p)])
      if(payment.status!=='pending')setMessage(payment.result_description||'Unable to start payment. Please try again.')
    }catch(e){setError(paymentError(e))}finally{setBusy(false)}
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">PAYMENTS</span><h1>Pay with M-Pesa</h1><p>{user.role==='employer'?'Choose your contact-access plan.':'Choose your Premium membership.'}</p></div></div>
    {error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert" role="status">{message}</p>}
    {!membership?<p role="status">Loading payments…</p>:<section className="card form-section mpesa-checkout">
      <div className="mpesa-checkout-heading"><h2>M-Pesa payment</h2><span className="badge">{membership.active?'Active':'Inactive'}</span></div>
      {membership.expires_at&&<p>Expiry: {new Date(membership.expires_at).toLocaleString()}</p>}
      {sandbox&&<p className="privacy-note">Sandbox test mode. Test payments do not activate membership.</p>}
      {membership.payments_enabled===false&&<p role="status">M-Pesa requests are currently unavailable.</p>}
      <form onSubmit={send}>
        <label>Choose your plan<select value={plan?.code||''} onChange={e=>{setSelected(e.target.value);setAgreed(false)}} disabled={busy||waiting}>{membership.plans.map(p=><option key={p.code} value={p.code}>KES {p.amount} · {p.days} days</option>)}</select></label>
        {plan&&<p className="mpesa-checkout-amount">KES {plan.amount}<small>{plan.days} days</small></p>}
        <label>M-Pesa number<input type="tel" autoComplete="tel" name="phone" placeholder="0712 345 678" maxLength={32} value={phone} onChange={e=>setPhone(e.target.value)} required disabled={busy||waiting}/></label>
        <p>Enter your M-Pesa number to receive a payment prompt on your phone.</p>
        <label className="checkbox-label"><input type="checkbox" name="termsAccepted" required checked={agreed} onChange={e=>setAgreed(e.target.checked)} disabled={busy||waiting}/><span>I have read and agree to the <a href="/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a>.</span></label>
        <button className="button primary full" disabled={busy||waiting||!plan||membership.payments_enabled===false}>{busy?'Sending…':'Send payment request'}</button>
        <p className="form-footnote">Sending authorizes one request for the amount shown. Enter your PIN only in M-Pesa.</p>
      </form>
      {pending&&<p role="status" className="mpesa-checkout-status">{retrySandbox?'The previous sandbox test is unconfirmed. You can send a new test request.':'Waiting for payment confirmation. This page updates automatically.'}</p>}
    </section>}
    <section className="card form-section"><h2>Recent payments</h2>{payments.length?payments.map(p=><div className="payment-row" key={p.id}><span>KES {p.amount}{p.environment==='sandbox'?' · Sandbox test':''}</span><strong>{p.environment==='sandbox'&&membership?.payment_environment==='production'&&p.status==='pending'?'Inactive sandbox test':p.status==='completed'?'Confirmed':p.status==='failed'?'Not confirmed':'Pending'}</strong></div>):<p>No payments yet.</p>}</section>
  </>
}
