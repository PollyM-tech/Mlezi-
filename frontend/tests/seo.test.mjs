import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PUBLIC_PAGES, entryRoute, publicPage, siteConfig } from '../src/lib/public-pages.js'
import { structuredData } from '../src/lib/seo.js'
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
  assert.doesNotMatch(sitemap, /#|caregivers\/|app\/|identity\/|account|selfie/)
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

test('public pages have useful structured data and large share cards without invented reviews or offices', async () => {
  const { structuredData, jsonForHtml } = await import('../src/lib/seo.js')
  const page = publicPage('/kenya/')
  const graph = structuredData(page, live)['@graph']
  assert.deepEqual(graph.map(node => node['@type']), ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList'])
  assert.equal(graph[2].url, 'https://example.test/kenya/')
  assert.equal(graph[3].itemListElement[1].item, graph[2].url)
  assert.equal(structuredData(null, live), null)
  assert.equal(structuredData(page, {}), null)
  assert.equal(structuredData(page, { ...live, VERCEL_ENV: 'preview' }), null)
  assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|LocalBusiness|streetAddress|SearchAction/)
  assert.equal(jsonForHtml({ text: '</script>' }).includes('</script>'), false)
  const html = renderDocument(template, page, '<main>Kenya care guide</main>', { ...live, VITE_GOOGLE_SITE_VERIFICATION: 'public-verification-token' })
  assert.match(html, /application\/ld\+json/)
  assert.match(html, /summary_large_image/)
  assert.match(html, /https:\/\/example.test\/social-card.png/)
  assert.match(html, /google-site-verification/)
  assert.doesNotMatch(renderDocument(template, null, '', live), /application\/ld\+json/)
})


test('launch guides and homepage FAQs expose only real public information', () => {
  for (const city of ['nairobi','mombasa','kisumu','nakuru','kiambu','eldoret']) assert.ok(publicPage(`/kenya/${city}/`))
  assert.ok(publicPage('/safe-hiring/'))
  assert.ok(publicPage('/identity-checks/'))
  const data = structuredData(publicPage('/'), live)['@graph']
  const faq = data.find(node => node['@type'] === 'FAQPage')
  assert.ok(faq.mainEntity.length > 0)
  for (const entry of faq.mainEntity) assert.ok(entry.name && entry.acceptedAnswer.text)
  assert.doesNotMatch(JSON.stringify(data), /aggregateRating|reviewCount|Piloted with/)
})

test('service guides are distinct public documents linked to hiring and city guides', () => {
  const paths = ['/newborn-care/', '/babysitting/', '/live-in-nannies/', '/travel-nannies/']
  const { sitemap } = crawlerFiles(live)
  assert.equal(new Set(PUBLIC_PAGES.map(page => page.path)).size, PUBLIC_PAGES.length)
  for (const path of paths) {
    const page = publicPage(path)
    assert.ok(page?.sections.length >= 5)
    assert.ok(sitemap.includes(`<loc>https://example.test${path}</loc>`))
    assert.ok(page.resources.some(link => link.href === '/safe-hiring/'))
    assert.ok(publicPage('/kenya/').resources.some(link => link.href === path))
    for (const city of ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'kiambu', 'eldoret']) {
      const guide = publicPage(`/kenya/${city}/`)
      assert.ok(guide.resources.some(link => link.href === path))
      assert.ok(guide.sections.length >= 8)
    }
  }
  const bodies = paths.map(path => publicPage(path).sections.map(([, body]) => body).join(' '))
  assert.equal(new Set(bodies).size, paths.length)
})
