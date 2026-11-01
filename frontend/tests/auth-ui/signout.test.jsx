import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Website from '../../src/components/Website.jsx'
import {beginSignOut,createAuthStorage} from '../../src/lib/signOut.js'
const state=vi.hoisted(()=>({revoke:vi.fn(),detach:vi.fn(),close:vi.fn()}))
vi.mock('@convex-dev/auth/react',()=>({ConvexAuthProvider:({children})=>children,useAuthActions:()=>({signIn:vi.fn(),signOut:state.revoke}),useConvexAuth:()=>({isAuthenticated:!!sessionStorage.getItem('__convexAuthJWT_mleziconvexauth'),isLoading:false,fetchAccessToken:vi.fn()})}))
vi.mock('convex/react',()=>({useConvexAuth:()=>({isAuthenticated:!!sessionStorage.getItem('__convexAuthJWT_mleziconvexauth'),isLoading:false}),useQuery:()=>({status:'profile_required',account:{id:'test-account',role:'caregiver',phone:'0712345678'}}),useMutation:()=>vi.fn()}))
vi.mock('../../src/lib/convexClient.js',()=>({getConvexClient:()=>({close:state.close}),detachConvexClient:state.detach}))
vi.mock('../../src/App.jsx',()=>({default:()=> <main>Signed-out account application</main>}))
beforeEach(()=>{sessionStorage.clear();state.revoke.mockReset();state.detach.mockReset();state.close.mockReset();window.history.replaceState({},'','/account');window.history.pushState({},'','/workspace')})
afterEach(()=>{cleanup();vi.restoreAllMocks();window.history.replaceState({},'','/')})
it('returns home immediately with a slow server and does not expose the account on Back',async()=>{
 let resolve
 state.revoke.mockImplementation(()=>new Promise(done=>{resolve=done}))
 sessionStorage.setItem('__convexAuthJWT_mleziconvexauth','test-placeholder')
 sessionStorage.setItem('__convexAuthRefreshToken_mleziconvexauth','test-placeholder')
 sessionStorage.setItem('cookie-preference','declined')
 render(<Website/> )
 await userEvent.click(await screen.findByRole('button',{name:'Sign out'}, {timeout:5000}))
 expect(window.location.pathname).toBe('/')
 expect(await screen.findByRole('heading',{level:1})).toHaveProperty('textContent',expect.stringContaining('A little care.'))
 expect(sessionStorage.getItem('__convexAuthJWT_mleziconvexauth')).toBeNull()
 expect(sessionStorage.getItem('__convexAuthRefreshToken_mleziconvexauth')).toBeNull()
 expect(sessionStorage.getItem('cookie-preference')).toBe('declined')
 expect(state.revoke).toHaveBeenCalledOnce()
 expect(state.close).not.toHaveBeenCalled()
 window.history.back()
 await screen.findByText('Signed-out account application')
 expect(screen.queryByRole('heading',{name:'Your profile photo is required'})).toBeNull()
 resolve()
 await waitFor(()=>expect(state.close).toHaveBeenCalledOnce())
})
it('a retiring provider cannot remove or restore credentials after a later sign-in',async()=>{
 const old=createAuthStorage(sessionStorage), key='__convexAuthJWT_mleziconvexauth'
 old.setItem(key,'old-placeholder');old.retire()
 const current=createAuthStorage(sessionStorage);current.setItem(key,'new-placeholder')
 old.removeItem(key);old.setItem(key,'stale-placeholder')
 expect(current.getItem(key)).toBe('new-placeholder')
 expect(old.getItem(key)).toBeNull()
})
it('completes local sign-out when the revocation request fails',async()=>{
 const storage=createAuthStorage(sessionStorage), home=vi.fn(),detach=vi.fn(),clear=vi.fn(),dispose=vi.fn()
 storage.setItem('__convexAuthJWT_mleziconvexauth','test-placeholder')
 beginSignOut({revoke:()=>Promise.reject(new Error('offline')),storage,goHome:home,detach,clearSession:clear,dispose})
 expect(home).toHaveBeenCalledOnce();expect(detach).toHaveBeenCalledOnce();expect(clear).toHaveBeenCalledOnce()
 expect(sessionStorage.getItem('__convexAuthJWT_mleziconvexauth')).toBeNull()
 await waitFor(()=>expect(dispose).toHaveBeenCalledOnce())
})
