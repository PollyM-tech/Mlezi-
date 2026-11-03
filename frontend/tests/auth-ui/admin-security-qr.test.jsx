import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {render,screen,cleanup,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {getFunctionName} from 'convex/server'
import AdminSecurity from '../../src/components/AdminSecurity.jsx'
const state=vi.hoisted(()=>({begin:vi.fn(),verify:vi.fn(),status:{configured:true,enrolled:false}}))
vi.mock('convex/react',()=>({useQuery:()=>state.status,useMutation:ref=>getFunctionName(ref)==='adminSecurity:begin'?state.begin:state.verify}))
vi.mock('../../src/lib/signOut.js',()=>({useSignOut:()=>vi.fn()}))
beforeEach(()=>{state.status={configured:true,enrolled:false};state.begin.mockReset().mockResolvedValue({secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/Mlezi:fixture%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Mlezi&algorithm=SHA1&digits=6&period=30'});state.verify.mockReset().mockResolvedValue({ok:true})})
afterEach(cleanup)
it('shows an inline QR only after authorized setup and keeps manual enrollment available',async()=>{
 const user=userEvent.setup();const {container}=render(<AdminSecurity/>);
 expect(screen.queryByRole('img')).toBeNull();await user.click(screen.getByRole('button',{name:'Set up authenticator'}))
 expect((await screen.findByRole('img',{name:'Mlezi authenticator setup QR code'})).tagName.toLowerCase()).toBe('svg')
 expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeTruthy();expect(container.querySelector('img,canvas,iframe')).toBeNull()
 await user.type(screen.getByLabelText('Authenticator code'),'123456');await user.click(screen.getByRole('button',{name:'Verify and continue'}))
 await waitFor(()=>expect(screen.queryByRole('img')).toBeNull());expect(state.verify).toHaveBeenCalledWith({code:'123456'})
})
it('does not show an enrollment QR for an existing authenticator',()=>{
 state.status={configured:true,enrolled:true};render(<AdminSecurity/>);
 expect(screen.queryByRole('img')).toBeNull();expect(screen.getByLabelText('Authenticator code')).toBeTruthy();expect(state.begin).not.toHaveBeenCalled()
})
it('retains setup after an incorrect confirmation instead of granting access',async()=>{
 state.verify.mockResolvedValue({ok:false,error:'Invalid or already used authenticator code.'});const user=userEvent.setup();render(<AdminSecurity/>);
 await user.click(screen.getByRole('button',{name:'Set up authenticator'}));await screen.findByRole('img');await user.type(screen.getByLabelText('Authenticator code'),'000000');await user.click(screen.getByRole('button',{name:'Verify and continue'}));
 expect((await screen.findByRole('alert')).textContent).toContain('Invalid');expect(screen.getByRole('img')).toBeTruthy()
})
