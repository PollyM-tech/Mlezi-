import { spawnSync } from 'node:child_process'
import { join,resolve } from 'node:path'
import { mkdirSync,chmodSync } from 'node:fs'
const directory=process.argv[2]
if(!directory)throw Error('Provide a new private backup directory; exports include private identity files.')
mkdirSync(directory,{mode:0o700})
const path=join(resolve(directory),'convex-with-files.zip')
const result=spawnSync(process.execPath,[join(process.cwd(),'node_modules/convex/bin/main.js'),'export','--include-file-storage','--path',path],{encoding:'utf8',timeout:300000})
if(result.status!==0)throw Error('Backup failed. No private export contents were printed.')
chmodSync(path,0o600)
console.log('Private database and file backup completed. Store it encrypted with restricted access and perform a restore drill before release.')
