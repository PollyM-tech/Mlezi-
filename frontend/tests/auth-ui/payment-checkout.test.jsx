import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {render,screen,cleanup,fireEvent,act,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Membership from '../../src/components/Membership.jsx'
import {LEGAL_VERSION} from '../../convex/lib/legalPolicy.js'
const state=vi.hoisted(()=>({api:vi.fn(),history:[],active:false,environment:'sandbox'}))
vi.mock('../../src/lib/api',()=>({api:(...args)=>state.api(...args)}))
beforeEach(()=>{
 state.history=[];state.active=false;state.environment='sandbox'
 state.api.mockReset().mockImplementation(async path=>path==='/memberships'?{active:state.active,payments_enabled:true,payment_environment:state.environment,plans:[{code:'employer_30_days',amount:300,days:30}]}:path==='/payments'?{payments:state.history}:path.startsWith('/payments/')?{payment:state.history[0]}:{})
})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('requires agreement, links Mlezi terms and sends the selected amount through server-priced checkout',async()=>{
 const user=userEvent.setup();render(<Membership user={{role:'employer',phone:'0712345678'}}/>);await screen.findByLabelText('M-Pesa number')
 const button=screen.getByRole('button',{name:'Send payment request'});expect(button.disabled).toBe(false)
 fireEvent.submit(button.closest('form'));expect(state.api.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0)
 expect(screen.getByRole('link',{name:'Terms of Service'}).getAttribute('href')).toBe('/terms/')
 await user.click(screen.getByRole('checkbox'))
 state.api.mockImplementation(async(path,options)=>{if(options?.method==='POST'){state.history=[{id:'new',amount:300,status:'pending',environment:'sandbox',created_at:new Date().toISOString()}];return {payment:state.history[0]}};return path==='/memberships'?{active:false,payments_enabled:true,payment_environment:'sandbox',plans:[{code:'employer_30_days',amount:300,days:30}]}:{payments:state.history}})
 await user.click(button);expect(state.api).toHaveBeenCalledWith('/payments/stk/start',{method:'POST',body:{planCode:'employer_30_days',phone:'0712345678',termsAccepted:true,termsVersion:LEGAL_VERSION}})
 expect(screen.getByRole('button',{name:'Send payment request'}).disabled).toBe(true)
})
it('keeps the request button visible but prevents another request while a live payment is unresolved',async()=>{
 state.environment='production';state.history=[{id:'live',amount:300,status:'pending',environment:'production',created_at:new Date(Date.now()-600000).toISOString()}]
 render(<Membership user={{role:'employer'}}/>);const button=await screen.findByRole('button',{name:'Send payment request'});expect(button.disabled).toBe(true)
 expect(screen.getByRole('status').textContent).toContain('updates automatically');expect(state.api.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(0)
})
it('restores sending for an old sandbox attempt through an explicit new authorized test',async()=>{
 state.history=[{id:'old',amount:300,status:'pending',environment:'sandbox',created_at:new Date(Date.now()-240000).toISOString()}]
 const user=userEvent.setup();render(<Membership user={{role:'employer',phone:'0712345678'}}/>);const button=await screen.findByRole('button',{name:'Send payment request'});expect(button.disabled).toBe(false)
 await user.click(screen.getByRole('checkbox'));await user.click(button)
 expect(state.api).toHaveBeenCalledWith('/payments/stk/start',{method:'POST',body:expect.objectContaining({replaceSandbox:true,termsAccepted:true})})
})
it('updates membership and returns to payment entry automatically when focus brings a final result',async()=>{
 vi.spyOn(document,'hidden','get').mockReturnValue(false)
 state.history=[{id:'pending',amount:300,status:'pending',environment:'production',created_at:new Date().toISOString()}];state.environment='production'
 render(<Membership user={{role:'employer'}}/>);await screen.findByText('Inactive')
 state.active=true;state.history=[{...state.history[0],status:'completed',result_description:'Payment confirmed'}]
 await act(async()=>{fireEvent(window,new Event('focus'))})
 await waitFor(()=>expect(screen.getByText('Active')).toBeTruthy());expect(screen.getByRole('button',{name:'Send payment request'}).disabled).toBe(false)
 expect(state.api.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(0)
})
it('allows live payment entry despite a historical pending sandbox test',async()=>{
 state.environment='production';state.history=[{id:'historical-test',amount:300,status:'pending',environment:'sandbox',created_at:new Date().toISOString()}]
 render(<Membership user={{role:'employer'}}/>);
 expect((await screen.findByRole('button',{name:'Send payment request'})).disabled).toBe(false)
 expect(screen.getByLabelText('M-Pesa number').disabled).toBe(false);expect(screen.getByText('Inactive sandbox test')).toBeTruthy()
})
