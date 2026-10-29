import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, basename } from 'node:path'
if (!/^CONVEX_DEPLOYMENT=dev:tidy-perch-115(?:\s|$)/m.test(readFileSync('.env.local', 'utf8'))) throw new Error('Select the intended development deployment first.')
const file = process.argv[2]
if (!file) throw new Error('Provide the private snapshot.json path.')
function run(name, args = {}) {
  // Feed private data through stdin so it never appears in the process list.
  const entry = join(process.cwd(), 'node_modules/convex/bin/main.js')
  const bootstrap = `let input = ''; for await (const chunk of process.stdin) input += chunk; const p = JSON.parse(input); process.argv = [process.execPath, p.entry, 'run', p.name, JSON.stringify(p.args)]; await import(p.entry);`
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', bootstrap], { input: JSON.stringify({ entry, name, args }), encoding: 'utf8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`Migration operation ${name} failed. No private data was printed.`)
  try { return JSON.parse(result.stdout) } catch { throw new Error('Unexpected migration response') }
}
const status = run('migration:status')
if (status.completed) { console.log('Snapshot was already imported; no records changed.'); process.exit(0) }
const snapshot = JSON.parse(readFileSync(file, 'utf8'))
const uploaded = []
for (const asset of snapshot.assets) {
  if (basename(asset.file) !== asset.file) throw new Error('Invalid asset path')
  const url = run('migration:uploadUrl')
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': asset.contentType }, body: readFileSync(join(dirname(file), asset.file)) })
  if (!response.ok) throw new Error('Image copy failed; the database was not switched.')
  const { storageId } = await response.json()
  uploaded.push({ table: asset.table, id: asset.id, field: asset.field, storageId })
}
const result = run('migration:importSnapshot', { tables: snapshot.tables, assets: uploaded })
console.log(JSON.stringify({ imported: result.imported, counts: result.counts, assets: uploaded.length }))
