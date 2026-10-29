import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
const cli=join(process.cwd(),'node_modules/convex/bin/main.js')
const existing=spawnSync(process.execPath,[cli,'env','get','AUTH_ADMIN_ENCRYPTION_KEY'],{encoding:'utf8',timeout:60000})
if(existing.status===0&&existing.stdout.trim())console.log('Administrator encryption key already exists; retained unchanged.')
else{
 const result=spawnSync(process.execPath,[cli,'env','set','AUTH_ADMIN_ENCRYPTION_KEY'],{input:randomBytes(32).toString('base64'),encoding:'utf8',timeout:60000})
 if(result.status!==0)throw new Error('Unable to configure administrator encryption. No key was printed.')
 console.log('Administrator encryption key configured. No key was printed. Preserve it in deployment backups; changing it invalidates authenticator enrollment.')
}
