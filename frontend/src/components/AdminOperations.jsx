import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
export default function AdminOperations(){
 const users=useQuery(api.moderation.users),requests=useQuery(api.privacy.requests),log=useQuery(api.moderation.auditLog)
 const suspend=useMutation(api.moderation.suspend),resolve=useMutation(api.privacy.resolve)
 const [error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function run(fn){setBusy(true);setError('');try{await fn()}catch(e){setError(typeof e.data==='string'?e.data:e.data?.message||'Unable to save this change.')}finally{setBusy(false)}}
 return <>{error&&<p role="alert">{error}</p>}<section className="card form-section"><h2>Privacy requests</h2>{requests?.length?requests.map(r=><article key={r._id}><p>{r.type} · account {r.accountId}</p><p className="preserve-lines">{r.details}</p>{r.type==='correction'&&<button className="button secondary" disabled={busy} onClick={()=>run(()=>resolve({id:r._id}))}>Mark handled</button>}</article>):<p>No open requests.</p>}</section><section className="card form-section"><h2>Account safety</h2>{users?.filter(u=>u.role!=='admin'&&!u.deletionPending).map(u=><form key={u.id} onSubmit={e=>{e.preventDefault();const reason=new FormData(e.currentTarget).get('reason');run(()=>suspend({accountId:u.id,suspended:!u.suspended,reason}))}}><h3>{u.name} · {u.role}</h3><label>Reason<input name="reason" maxLength={1000} required={!u.suspended} /></label><button className="button secondary" disabled={busy}>{u.suspended?'Restore account':'Suspend account'}</button></form>)}</section><section className="card form-section"><h2>Recent security events</h2>{log?.map(r=><p key={r._id}>{new Date(r.createdAt).toLocaleString()} · {r.action} · {r.targetId||'account session'}</p>)}</section></>
}
