import {it,expect,vi,afterEach} from 'vitest'
import {act,render,screen,cleanup,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StkPayment from '../../src/components/StkPayment.jsx'
const state=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('../../src/lib/api',()=>({api:(...args)=>state.api(...args)}))
afterEach(()=>{cleanup();state.api.mockReset();vi.useRealTimers();vi.restoreAllMocks()})
const props={plan:{code:'employer_30_days',amount:300,days:30},environment:'sandbox',user:{phone:'0712345678'},onRefresh:vi.fn()}
it('submits only the chosen plan and phone, labels sandbox, and blocks repeat prompts while pending',async()=>{
 const user=userEvent.setup();state.api.mockResolvedValue({payment:{id:'fixture',provider:'daraja_stk',status:'pending',result_description:'Check your phone'}})
 render(<StkPayment {...props}/>);expect(screen.getByText(/does not activate paid membership/)).toBeTruthy()
 await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Send test STK request'}))
 await waitFor(()=>expect(state.api).toHaveBeenCalledWith('/payments/stk/start',{method:'POST',body:{planCode:'employer_30_days',phone:'0712345678'}}))
 expect(screen.queryByRole('button',{name:'Send test STK request'})).toBeNull()
 await user.click(screen.getByRole('button',{name:'Check STK payment status'}));expect(state.api).toHaveBeenLastCalledWith('/payments/stk/check',{method:'POST',body:{id:'fixture'}})
})
it('keeps any existing pending payment from starting a second request',()=>{
 render(<StkPayment {...props} pending={{id:'manual',provider:'manual_mpesa',status:'pending'}}/>);
 expect(screen.queryByRole('button',{name:'Send test STK request'})).toBeNull();expect(screen.getByRole('status').textContent).toContain('Do not pay again')
})

it('updates a confirmed request without reloading or resending, even while parent history is stale',async()=>{
 vi.useFakeTimers();vi.spyOn(document,'hidden','get').mockReturnValue(false)
 const refresh=vi.fn();state.api.mockResolvedValue({payment:{id:'pending-id',provider:'daraja_stk',status:'completed',result_description:'Sandbox test confirmed. No membership activated.'}})
 const {unmount}=render(<StkPayment {...props} onRefresh={refresh} pending={{id:'pending-id',provider:'daraja_stk',status:'pending'}}/>);
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000)})
 expect(state.api).toHaveBeenCalledWith('/payments/pending-id');expect(refresh).toHaveBeenCalledTimes(1)
 expect(screen.queryByRole('button',{name:'Check STK payment status'})).toBeNull()
 expect(screen.getByRole('status').textContent).toContain('Sandbox test confirmed')
 await act(async()=>{await vi.advanceTimersByTimeAsync(15000)})
 expect(state.api).toHaveBeenCalledTimes(1);unmount()
})
it('pauses status reads in a hidden tab and cleans up when the screen closes',async()=>{
 vi.useFakeTimers();const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true)
 state.api.mockResolvedValue({payment:{id:'pending-id',provider:'daraja_stk',status:'pending'}})
 const {unmount}=render(<StkPayment {...props} pending={{id:'pending-id',provider:'daraja_stk',status:'pending'}}/>);
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000)});expect(state.api).not.toHaveBeenCalled()
 hidden.mockReturnValue(false);await act(async()=>{await vi.advanceTimersByTimeAsync(5000)});expect(state.api).toHaveBeenCalledTimes(1)
 unmount();await act(async()=>{await vi.advanceTimersByTimeAsync(10000)});expect(state.api).toHaveBeenCalledTimes(1)
})
it('offers closing an unconfirmed sandbox test but never a live request',async()=>{
 const user=userEvent.setup();state.api.mockResolvedValue({payment:{id:'test-id',status:'failed',result_description:'Sandbox test closed without confirmation. No membership activated.'}})
 const view=render(<StkPayment {...props} pending={{id:'test-id',provider:'daraja_stk',environment:'sandbox',status:'pending'}}/>);
 await user.click(screen.getByRole('button',{name:'Close sandbox test'}));expect(state.api).toHaveBeenCalledWith('/payments/stk/close-test',{method:'POST',body:{id:'test-id'}})
 expect(screen.getByRole('status').textContent).toContain('Sandbox test closed')
 view.unmount();render(<StkPayment {...props} environment="production" pending={{id:'live-id',provider:'daraja_stk',environment:'production',status:'pending'}}/>);
 expect(screen.queryByRole('button',{name:'Close sandbox test'})).toBeNull()
})
