import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({saved:null}))
vi.mock('node:fs/promises',()=>({mkdir:vi.fn(),readFile:vi.fn(async()=>state.saved),writeFile:vi.fn(async(_path,value,options)=>{if(options?.flag==='wx'&&state.saved)throw Object.assign(new Error('exists'),{code:'EEXIST'});state.saved=value})}))
import {terminalSettings,runTerminalTest} from '../../scripts/test-mpesa.mjs'
const env={MPESA_ENVIRONMENT:'sandbox',MPESA_SHORTCODE:'174379',MPESA_CONSUMER_KEY:'fixture-key',MPESA_CONSUMER_SECRET:'fixture-secret',MPESA_PASSKEY:'fixture-passkey',VITE_CONVEX_SITE_URL:'https://fixture.convex.site'}
beforeEach(()=>{state.saved=null;for(const[k,v]of Object.entries(env))vi.stubEnv(k,v)})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks()})
it('requires explicit live mode and the approved Paybill destination',()=>{
 const production={...env,MPESA_ENVIRONMENT:'production',MPESA_SHORTCODE:'4125123'}
 expect(()=>terminalSettings(production,false)).toThrow('--live')
 expect(terminalSettings(production,true).host).toBe('https://api.safaricom.co.ke')
 expect(()=>terminalSettings({...env,MPESA_SHORTCODE:'4125123'},false)).toThrow('sandbox shortcode')
 expect(()=>terminalSettings(env,true)).toThrow('production credentials')
})
it('previews without contacting the provider or printing credentials or the full phone',async()=>{
 const fetcher=vi.fn(),log=vi.spyOn(console,'log').mockImplementation(()=>{});vi.stubGlobal('fetch',fetcher)
 await runTerminalTest(['--phone','0712345678'],env)
 expect(fetcher).not.toHaveBeenCalled();expect(state.saved).toBeNull()
 const output=log.mock.calls.flat().join(' ');expect(output).toContain('KES 5');expect(output).not.toContain('0712345678');expect(output).not.toContain('fixture-secret')
})
it('sends exactly KES 5 once and refuses duplicate send attempts',async()=>{
 vi.spyOn(console,'log').mockImplementation(()=>{})
 const fetcher=vi.fn(async url=>Response.json(url.includes('/oauth/')?{access_token:'fixture-token'}:{ResponseCode:'0',CheckoutRequestID:'fixture-checkout',MerchantRequestID:'fixture-merchant'}));vi.stubGlobal('fetch',fetcher)
 await runTerminalTest(['--phone','0712345678','--send'],env)
 expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({Amount:5,PartyA:'254712345678',PartyB:'174379',AccountReference:'MLEZI5TEST',TransactionDesc:'Mlezi test'})
 expect(JSON.parse(state.saved)).toMatchObject({state:'pending',amount:5})
 await expect(runTerminalTest(['--phone','0712345678','--send'],env)).rejects.toThrow('test record already exists');expect(fetcher).toHaveBeenCalledTimes(2)
})
it('preserves an uncertain attempt so a network error cannot silently trigger another prompt',async()=>{
 vi.spyOn(console,'log').mockImplementation(()=>{})
 vi.stubGlobal('fetch',vi.fn(async url=>{if(url.includes('/oauth/'))return Response.json({access_token:'fixture-token'});throw new Error('timeout')}))
 await expect(runTerminalTest(['--phone','0712345678','--send'],env)).rejects.toThrow('attempt was saved')
 expect(JSON.parse(state.saved).state).toBe('unknown')
 await expect(runTerminalTest(['--phone','0712345678','--send'],env)).rejects.toThrow('test record already exists')
})
