import { afterEach, expect, it } from 'vitest'
import { updatePageMetadata } from '../../src/lib/seo.js'
import { publicPage } from '../../src/lib/public-pages.js'
const env = { VITE_APP_ORIGIN: 'https://mlezicare.com', VITE_SITE_INDEXABLE: 'true' }
afterEach(() => { document.head.innerHTML = '' })
it('updates public page descriptions and share data, then removes public metadata from private navigation', () => {
  updatePageMetadata(document, publicPage('/kenya/'), env, env.VITE_APP_ORIGIN)
  expect(document.querySelector('link[rel="canonical"]').href).toBe('https://mlezicare.com/kenya/')
  expect(document.querySelector('meta[name="description"]').content).toBe(publicPage('/kenya/').description)
  expect(JSON.parse(document.getElementById('mlezi-structured-data').textContent)['@graph'][2].url).toBe('https://mlezicare.com/kenya/')
  updatePageMetadata(document, publicPage('/support/'), env, env.VITE_APP_ORIGIN)
  expect(document.querySelector('meta[property="og:title"]').content).toBe(publicPage('/support/').title)
  expect(document.querySelectorAll('#mlezi-structured-data')).toHaveLength(1)
  updatePageMetadata(document, null, env, env.VITE_APP_ORIGIN)
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow')
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.querySelector('meta[property="og:url"]')).toBeNull()
  expect(document.getElementById('mlezi-structured-data')).toBeNull()
})
it('does not index or emit production structured data on a different host', () => {
  updatePageMetadata(document, publicPage('/'), env, 'https://preview.example.test')
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow')
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.getElementById('mlezi-structured-data')).toBeNull()
})
