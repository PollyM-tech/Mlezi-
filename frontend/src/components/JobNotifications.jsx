import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api.js'
export default function JobNotifications({user}) {
  const data=useQuery(api.jobs.alerts,['employer','caregiver'].includes(user.role)?{}:'skip')
  const count=user.role==='employer'?data?.applications:data?.offers
  if(!count)return null
  return <p className="alert" role="status"><a href="/jobs">{count}{data.more?'+':''} {user.role==='employer'?'job applications to review':'job offers awaiting your response'} →</a></p>
}
