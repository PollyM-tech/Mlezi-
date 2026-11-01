import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSignOut } from '../lib/signOut.js'
import { api } from '../../convex/_generated/api.js'
export default function AdminSecurity() {
  const status = useQuery(api.adminSecurity.status), begin = useMutation(api.adminSecurity.begin), verify = useMutation(api.adminSecurity.verify)
  const signOut = useSignOut()
  const [setup,setSetup]=useState(null), [error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function start(){setBusy(true);setError('');try{setSetup(await begin())}catch(e){setError(typeof e.data==='string'?e.data:'Unable to start authenticator setup.')}finally{setBusy(false)}}
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const result=await verify({code:new FormData(e.currentTarget).get('code')});if(!result.ok)setError(result.error);else setSetup(null)}catch(e){setError(typeof e.data==='string'?e.data:'Unable to verify code.')}finally{setBusy(false)}}
  return <main className="card state-panel" style={{maxWidth:600,margin:'60px auto'}}><h1>Protect your administrator account</h1><p>Private identity documents require an authenticator code. Confirmation lasts 15 minutes for this sign-in session.</p>{error&&<p role="alert">{error}</p>}{!status?<p>Loading security settings…</p>:!status.configured?<p>Administrator security needs operator configuration before access is available.</p>:<>{!status.enrolled&&!setup&&<button className="button primary" disabled={busy} onClick={start}>Set up authenticator</button>}{setup&&<><p>Add a time-based account in your authenticator app, named Mlezi. Enter this setup key manually:</p><p><code style={{overflowWrap:'anywhere'}}>{setup.secret}</code></p><p>Keep the authenticator backup in a safe place. If access is lost, a deployment operator must verify your identity and reset enrollment.</p></>}{(status.enrolled||setup)&&<form onSubmit={submit}><label>Authenticator code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label><button className="button primary" disabled={busy}>Verify and continue</button></form>}</>}<button className="text-button" onClick={()=>signOut()}>Sign out</button></main>
}
