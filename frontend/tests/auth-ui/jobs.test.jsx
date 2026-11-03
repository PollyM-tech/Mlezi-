import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {getFunctionName} from 'convex/server'
import JobBoard from '../../src/components/JobBoard.jsx'
import CaregiverOverview from '../../src/components/CaregiverOverview.jsx'
const state=vi.hoisted(()=>({job:null,applications:[],mutation:vi.fn(),profileApi:vi.fn()}))
vi.mock('../../src/lib/api',()=>({api:(...args)=>state.profileApi(...args)}))
vi.mock('convex/react',()=>({
 useMutation:ref=>args=>state.mutation(getFunctionName(ref),args),
 useQuery:(ref,args)=>{
  if(args==='skip')return undefined
  const name=getFunctionName(ref)
  if(name==='jobs:list')return{jobs:[state.job],cursor:null}
  if(name==='jobs:detail')return state.job
  if(name==='jobs:applications')return{applications:state.applications,cursor:null}
  if(name==='jobs:mine')return{applications:[],cursor:null}
  return undefined
 },
}))
beforeEach(()=>{
 state.job={id:'job1',title:'Weekday care',description:'Care for an infant in agreed hours.',category:'nanny',serviceTypes:['live_out'],location:'Nairobi',payMin:15000,payMax:20000,payPeriod:'monthly',status:'open',applicationsCount:0,employerName:'Test Parent',ownApplication:null}
 state.applications=[];state.mutation.mockReset().mockResolvedValue({id:'job1'});state.profileApi.mockReset()
})
afterEach(cleanup)
it('posts employer care requirements with a validated pay range and selected arrangements',async()=>{
 render(<JobBoard user={{role:'employer'}}/>)
 fireEvent.click(screen.getByText('Post a care job'))
 for(const[label,value]of [['Job title','Care for my infant'],['General location','Nairobi'],['Minimum pay (KES)','15000'],['Maximum pay (KES)','20000'],['Care requirements','Infant care on weekdays.']])fireEvent.change(screen.getByLabelText(label),{target:{value}})
 fireEvent.click(screen.getByRole('button',{name:'Publish job'}))
 await waitFor(()=>expect(state.mutation).toHaveBeenCalledWith('jobs:create',expect.objectContaining({title:'Care for my infant',location:'Nairobi',payMin:15000,payMax:20000,payPeriod:'monthly',serviceTypes:['live_out']})))
})
it('lets a caregiver submit proposed pay and a message without implying identity approval',async()=>{
 render(<JobBoard user={{role:'caregiver'}}/>)
 fireEvent.click(screen.getByRole('button',{name:'Weekday care'}))
 fireEvent.change(screen.getByLabelText('Proposed pay (KES)'),{target:{value:'18000'}})
 fireEvent.change(screen.getByLabelText('Why are you a good fit?'),{target:{value:'I have newborn experience.'}})
 fireEvent.click(screen.getByRole('button',{name:'Submit proposal'}))
 await waitFor(()=>expect(state.mutation).toHaveBeenCalledWith('jobs:apply',{id:'job1',proposedPay:18000,payPeriod:'monthly',message:'I have newborn experience.'}))
 expect(screen.getByText(/Submitting shares your profile/)).toBeTruthy()
})
it('shows unverified identity on a pending application and makes an offer instead of silently hiring',async()=>{
 state.applications=[{id:'app1',status:'submitted',message:'Experienced nanny',proposedPay:18000,payPeriod:'monthly',profile:{id:'care1',name:'Test Nanny',verification_status:'pending',adult_confirmed:false,service_category:'nanny',service_types:['live_out'],skills:[],languages:[],years_experience:3}}]
 render(<JobBoard user={{role:'employer'}}/>)
 fireEvent.click(screen.getByRole('button',{name:'Weekday care'}))
 expect(screen.getByText('Identity unverified')).toBeTruthy()
 expect(screen.queryByText('Identity verified')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Offer this job'}))
 await waitFor(()=>expect(state.mutation).toHaveBeenCalledWith('jobs:decide',{id:'app1',decision:'offer'}))
 expect(await screen.findByText(/caregiver must accept before hiring/)).toBeTruthy()
})
it('keeps an offered application visible when identity approval blocks acceptance',async()=>{
 state.job.ownApplication={id:'app1',status:'offered',message:'My proposal',proposedPay:18000,payPeriod:'monthly'}
 state.mutation.mockRejectedValue({data:{message:'Your identity and adult age must be approved before accepting a hire'}})
 render(<JobBoard user={{role:'caregiver'}}/>)
 fireEvent.click(screen.getByRole('button',{name:'Weekday care'}))
 fireEvent.click(screen.getByRole('button',{name:'Accept offer'}))
 expect((await screen.findByRole('alert')).textContent).toContain('identity and adult age')
 expect(screen.getByText('My proposal')).toBeTruthy()
})
it('changes marketplace visibility independently of availability',async()=>{
 const profile={id:'care1',name:'Nanny',service_category:'nanny',service_types:['live_in'],is_visible:true,is_available:true,adult_confirmed:true,availability:[],skills:[],age_groups:[],languages:[]}
 state.profileApi.mockResolvedValue({profile:{...profile,is_visible:false}})
 const updated=vi.fn()
 render(<CaregiverOverview profile={profile} onUpdated={updated} onEdit={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'Hide my profile from the marketplace'}))
 await waitFor(()=>expect(updated).toHaveBeenCalledWith(expect.objectContaining({is_visible:false,is_available:true})))
 const body=state.profileApi.mock.calls[0][1].body
 expect(body.get('is_visible')).toBe('false');expect(body.has('is_available')).toBe(false)
})
