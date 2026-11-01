import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PUBLIC_PAGES, entryRoute, publicPage, siteConfig } from '../src/lib/public-pages.js'
import { crawlerFiles, renderDocument } from '../scripts/seo-output.mjs'
import { matchesKeywords, normalizeSearch } from '../convex/lib/discoverySearch.js'

const live = { VITE_APP_ORIGIN: 'https://example.test', VITE_SITE_INDEXABLE: 'true' }
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
test('only explicitly enabled production origins can be indexed', () => {
  assert.equal(siteConfig({}).indexable, false)
  assert.throws(() => siteConfig({ VITE_SITE_INDEXABLE: 'true' }), /VITE_APP_ORIGIN/)
  for (const origin of ['http://example.test', 'https://localhost:5173', 'https://example.test/path', 'https://user:pass@example.test']) assert.throws(() => siteConfig({ VITE_APP_ORIGIN: origin }))
  assert.match(crawlerFiles({}).robots, /Disallow: \/\n/)
  assert.doesNotMatch(crawlerFiles({}).sitemap, /<loc>/)
  assert.equal(siteConfig({ ...live, VERCEL_ENV: 'preview' }).indexable, false)
  assert.equal(siteConfig({ ...live, CONTEXT: 'deploy-preview' }).indexable, false)
})
test('sitemap and public canonical metadata never expose private routes or evidence', () => {
  const { robots, sitemap } = crawlerFiles(live)
  assert.match(robots, /Disallow: \/app\//)
  assert.match(robots, /Sitemap: https:\/\/example.test\/sitemap.xml/)
  for (const page of PUBLIC_PAGES) {
    const html = renderDocument(template, page, '<main>Readable content</main>', live)
    assert.ok(sitemap.includes(`<loc>https://example.test${page.path}</loc>`))
    assert.ok(html.includes(`rel="canonical" href="https://example.test${page.path}"`))
    assert.match(html, /content="index, follow"/)
    assert.doesNotMatch(html, /noindex|\/src\/assets/)
    assert.match(html, /<main>Readable content<\/main>/)
  }
  assert.doesNotMatch(sitemap, /#|caregivers\/|app\/|identity|account|selfie/)
  const privateHtml = renderDocument(template, null, '', live)
  assert.match(privateHtml, /noindex, nofollow/)
  assert.doesNotMatch(privateHtml, /rel="canonical"/)
})
test('old account links retain email codes and private destinations', () => {
  assert.deepEqual(entryRoute({ pathname: '/', search: '?code=example-only&next=1', hash: '#/signin' }), { redirect: '/signin?code=example-only&next=1' })
  assert.deepEqual(entryRoute({ pathname: '/', hash: '#/browse?category=travel_nanny' }), { redirect: '/caregivers?category=travel_nanny' })
  assert.deepEqual(entryRoute({ pathname: '/', search: '?code=example-only' }), { redirect: '/signin?code=example-only' })
  assert.deepEqual(entryRoute({ pathname: '/app/', hash: '#/workspace' }), { redirect: '/workspace' })
  assert.deepEqual(entryRoute({ pathname: '/', hash: '#/privacy' }), { redirect: '/privacy/' })
  assert.equal(publicPage('/burundi').path, '/burundi/')
  assert.equal(publicPage('/missing'), null)
})
test('Kenyan synonyms match stated household work without claiming every nanny offers it', () => {
  const nanny = { category: 'nanny', bio: 'Infant care', skills: ['First aid'] }
  const household = { ...nanny, bio: 'Experienced house help offering laundry by agreement.' }
  for (const q of ['maid', 'maids', 'househelp', 'house help', 'domestic worker']) {
    assert.equal(matchesKeywords(household, q), true)
    assert.equal(matchesKeywords(nanny, q), false)
  }
  assert.equal(matchesKeywords({ bio: 'Mermaid story time' }, 'maid'), false)
})
test('keywords combine real services, location and regional languages', () => {
  const p = { name: 'Example', category: 'travel_nanny', location: 'Nairobi', languages: ['Kirundi', 'Kiswahili', 'French'], skills: ['Newborn care'] }
  assert.equal(matchesKeywords(p, 'nannies Nairobi'), true)
  assert.equal(matchesKeywords(p, 'travel Kirundi'), true)
  assert.equal(matchesKeywords(p, 'newborn français'), true)
  assert.equal(matchesKeywords(p, 'Kinyarwanda'), false)
  assert.equal(normalizeSearch('Swahili'), normalizeSearch('Kiswahili'))
})
