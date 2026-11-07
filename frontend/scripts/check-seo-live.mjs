import { PUBLIC_PAGES } from '../src/lib/public-pages.js'
const origin = new URL(process.argv[2] || 'https://mlezicare.com')
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Provide the public HTTPS origin only.')
const failures = []
async function read(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20000) })
  return { response, text: await response.text() }
}
const { text: robots } = await read('/robots.txt')
const { text: sitemap } = await read('/sitemap.xml')
if (!robots.includes(`Sitemap: ${origin.origin}/sitemap.xml`) || /^Disallow: \/\s*$/m.test(robots)) failures.push('Public crawling or sitemap discovery is disabled.')
for (const page of PUBLIC_PAGES) {
  const { response, text } = await read(page.path)
  if (response.status !== 200) failures.push(`${page.path}: expected HTTP 200.`)
  if (!text.includes(`rel="canonical" href="${origin.origin + page.path}"`)) failures.push(`${page.path}: missing or incorrect canonical.`)
  if (!text.includes('content="index, follow"') || /noindex/i.test(response.headers.get('x-robots-tag') || '')) failures.push(`${page.path}: public indexing is disabled.`)
  if (!text.includes('id="mlezi-structured-data"')) failures.push(`${page.path}: structured data update is not deployed.`)
  if (!text.includes(`${origin.origin}/social-card.png`)) failures.push(`${page.path}: sharing image update is not deployed.`)
  if (!sitemap.includes(`<loc>${origin.origin + page.path}</loc>`)) failures.push(`${page.path}: missing from sitemap.`)
}
for (const path of ['/signin', '/membership']) {
  const { response, text } = await read(path)
  if (!/noindex/i.test(response.headers.get('x-robots-tag') || '') && !/noindex/i.test(text)) failures.push(`${path}: private indexing exclusion missing.`)
}
const missing = await read('/mlezi-seo-check-page-that-does-not-exist')
if (missing.response.status !== 404) failures.push('Unknown pages must return HTTP 404.')
const image = await fetch(new URL('/social-card.png', origin), { signal: AbortSignal.timeout(20000) })
if (!image.ok || !image.headers.get('content-type')?.includes('image/png')) failures.push('Social card must return an accessible PNG image.')
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
else console.log(`Public SEO checks passed for ${PUBLIC_PAGES.length} pages at ${origin.origin}. Search Console ownership and actual indexing require separate verification.`)
