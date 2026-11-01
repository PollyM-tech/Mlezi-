import { mkdir, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { LEGAL_CONTENT } from '../src/lib/legal-content.js'
import { legalConfiguration } from '../src/lib/legal.js'
import { LEGAL_VERSION } from '../convex/lib/legalPolicy.js'

const legal = legalConfiguration({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env })
const dir = new URL('../../Documentation/legal/', import.meta.url)
await mkdir(dir, { recursive: true })
for (const [type, page] of Object.entries(LEGAL_CONTENT)) {
  const lines = [`# Mlezi ${page.title}`, '', `Prepared 1 November 2026 · Version ${LEGAL_VERSION}`, '',
    '**Pre-launch review copy. Not a legal approval or publication authorization.**', '',
    `Operator name supplied: ${legal.entity}`, `Business structure: ${legal.structure}`, `Registration: ${legal.registration || 'Confirm if applicable'}`, `Service address: ${legal.address}`, 'Support route: /support/ and /app/#/privacy-account', '',
    ...page.sections.flatMap((section, i) => [`## ${i + 1}. ${section.title}`, '', ...(section.paragraphs || []).flatMap(p => [p, '']), ...(section.items || []).map(item => `- ${item}`), '']),
    ...(type === 'privacy' ? ['ODPC complaint route: https://www.odpc.go.ke/file-a-complaint/', ''] : []),
    'Source: frontend/src/lib/legal-content.js. Export again after changing the live policy text.', '',
  ]
  await writeFile(new URL(`${type}.md`, dir), lines.join('\n'))
}
console.log('Exported three legal review copies to Documentation/legal. Review status was not changed.')
