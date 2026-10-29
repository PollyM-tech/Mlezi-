import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
export default function ReportProfile({profileId}){
 const report=useMutation(api.moderation.reportProfile),[open,setOpen]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function submit(e){e.preventDefault();setBusy(true);try{await report({caregiverId:String(profileId),reason:new FormData(e.currentTarget).get('reason')});setOpen(false);setMessage('Your safety report is in the administrator queue.')}catch(e){setMessage(e.data?.message||'Unable to send your report.')}finally{setBusy(false)}}
 return <section className="card side-card"><h3>Profile safety</h3>{message&&<p role="status">{message}</p>}<button className="text-button" onClick={()=>setOpen(v=>!v)}>Report this profile</button>{open&&<form onSubmit={submit}><label>Reason<textarea name="reason" maxLength={1000} required /></label><button className="button secondary" disabled={busy}>Send report</button></form>}</section>
}
