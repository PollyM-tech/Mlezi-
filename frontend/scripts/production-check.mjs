import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const failures=[]
const required=['VITE_APP_ORIGIN','VITE_TURNSTILE_SITE_KEY','VITE_LEGAL_ENTITY','VITE_CONVEX_URL','VITE_CONVEX_SITE_URL']
for(const key of required)if(!process.env[key])failures.push(`Set ${key}.`)
try{const url=new URL(process.env.VITE_APP_ORIGIN);if(url.protocol!=='https:'||['localhost','127.0.0.1'].includes(url.hostname))throw Error()}catch{failures.push('Use the actual public HTTPS frontend origin.')}
if((process.env.CONVEX_DEPLOYMENT||'').startsWith('dev:'))failures.push('A development deployment must not be used for a production release.')
for(const flag of ['LEGAL_REVIEW_COMPLETE','BACKUP_RESTORE_TESTED','ALERTS_CONFIGURED','LIVE_AUTH_TESTED','LEGACY_ASSET_RETENTION_CONFIRMED','SUPPORT_FLOW_TESTED'])if(process.env[flag]!=='true')failures.push(`Complete and attest ${flag}.`)
if(spawnSync('git',['check-ignore','-q','../.env']).status!==0)failures.push('Root .env must be ignored by Git.')
if(spawnSync('git',['ls-files','--error-unmatch','../.env'],{stdio:'ignore'}).status===0)failures.push('A root environment file is tracked; resolve exposure before release.')
const headers=readFileSync('public/_headers','utf8');if(!headers.includes('Content-Security-Policy'))failures.push('Hosting security headers are missing.')
if(!failures.length){try{const health=await new ConvexHttpClient(process.env.VITE_CONVEX_URL).query(makeFunctionReference('health:status'),{});if(!health.guestSupportReady)failures.push('Configure guest support spam protection and its allowed hostnames on Convex.');if(!health.adminMfaConfigured)failures.push('Configure the administrator encryption key on the production deployment.');if(!health.emailSenderProductionReady)failures.push('Use a verified production email sender.');if(health.siteOrigin!==process.env.VITE_APP_ORIGIN)failures.push('Convex SITE_URL must match the public HTTPS frontend origin.')}catch{failures.push('Cannot verify the selected Convex production deployment.')}}
if(failures.length){console.error('Production launch is blocked:\n'+failures.map(s=>`- ${s}`).join('\n'));process.exitCode=1}else console.log('Local production checks pass. Verify Convex production environment, backup/file coverage, deployed HTTP headers and real-user journeys before publishing.')
