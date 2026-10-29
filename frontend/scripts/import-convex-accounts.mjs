import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

if (!/^CONVEX_DEPLOYMENT=dev:tidy-perch-115(?:\s|$)/m.test(readFileSync('.env.local', 'utf8'))) throw new Error('Select the intended development deployment first.')
const file = process.argv[2]
if (!file) throw new Error('Provide the private account-mapping export file path.')
const { records } = JSON.parse(readFileSync(file, 'utf8'))
if (!Array.isArray(records)) throw new Error('Expected a records array.')
let count = 0
for (let offset = 0; offset < records.length; offset += 100) {
  const result = spawnSync(process.execPath, [join(process.cwd(), 'node_modules/convex/bin/main.js'), 'run', 'accounts:importLegacy', JSON.stringify({ records: records.slice(offset, offset + 100) })], { encoding: 'utf8', timeout: 60000 })
  if (result.status !== 0) throw new Error('Account import stopped. Resolve the migration conflict or connection failure before retrying. No account data was printed.')
  count += records.slice(offset, offset + 100).length
}
console.log(`Verified/imported ${count} legacy account mappings. Email ownership is required before linking. No passwords were imported.`)
