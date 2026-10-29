import {it,expect,vi,beforeEach,afterEach} from 'vitest'
import {render,screen,cleanup} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFunctionName } from 'convex/server'
import AdminSecurity from '../../src/components/AdminSecurity.jsx'
const state=vi.hoisted(()=>({status:{enrolled:false,configured:true},begin:vi.fn(),verify:vi.fn(),signOut:vi.fn()}))
vi.mock('convex/react',()=>({useQuery:()=>state.status,useMutation:ref=>getFunctionName(ref)==='adminSecurity:begin'?state.begin:state.verify}))
vi.mock('@convex-dev/auth/react',()=>({useAuthActions:()=>({signOut:state.signOut})}))
beforeEach(()=>{state.status={enrolled:false,configured:true};state.begin.mockReset().mockResolvedValue({secret:'TESTSETUPKEY'});state.verify.mockReset().mockResolvedValue({ok:true})})
afterEach(cleanup)
it('shows a setup key only after the authenticated admin starts enrollment and clears it after confirmation',async()=>{
 render(<AdminSecurity />)
 expect(screen.queryByText('TESTSETUPKEY')).toBeNull()
 await userEvent.click(screen.getByRole('button',{name:'Set up authenticator'}))
 expect(await screen.findByText('TESTSETUPKEY')).toBeTruthy()
 await userEvent.type(screen.getByLabelText('Authenticator code'),'123456')
 await userEvent.click(screen.getByRole('button',{name:'Verify and continue'}))
 expect(state.verify).toHaveBeenCalledWith({code:'123456'})
 expect(screen.queryByText('TESTSETUPKEY')).toBeNull()
})
it('keeps enrolled administrators on the challenge when verification fails',async()=>{
 state.status={enrolled:true,configured:true};state.verify.mockResolvedValue({ok:false,error:'Invalid or already used authenticator code.'})
 render(<AdminSecurity />)
 await userEvent.type(screen.getByLabelText('Authenticator code'),'123456')
 await userEvent.click(screen.getByRole('button',{name:'Verify and continue'}))
 expect((await screen.findByRole('alert')).textContent).toContain('Invalid')
 expect(screen.queryByText('TESTSETUPKEY')).toBeNull()
})
