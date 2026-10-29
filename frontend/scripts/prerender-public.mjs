import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer, loadEnv } from 'vite'
import { PUBLIC_PAGES, siteConfig } from '../src/lib/public-pages.js'
import { crawlerFiles, renderDocument } from './seo-output.mjs'

// Run after Vite has produced its bundle; no database or private profile reads.
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const config = siteConfig(env)
const template = await readFile('dist/index.html', 'utf8')
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'))
const server = await createServer({ mode: 'production', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { default: PublicPages } = await server.ssrLoadModule('/src/components/PublicPages.jsx')
  for (const page of PUBLIC_PAGES) {
    let markup = renderToString(createElement(PublicPages, { page }))
    // SSR imports retain source URLs. Use Vite's exact emitted asset mapping.
    for (const [source, asset] of Object.entries(manifest)) if (asset.file && !asset.isEntry) markup = markup.replaceAll(`/${source}`, `/${asset.file}`)
    if (markup.includes('/src/assets/')) throw new Error(`Unresolved public asset on ${page.path}`)
    const dir = `dist${page.path}`
    await mkdir(dir, { recursive: true })
    await writeFile(`${dir}index.html`, renderDocument(template, page, markup, env))
  }
  await mkdir('dist/app', { recursive: true })
  await writeFile('dist/app/index.html', renderDocument(template, null, '<p>Open Mlezi with JavaScript enabled to sign in or browse caregivers.</p>', env))
  const notFound = renderDocument(template, null, renderToString(createElement(PublicPages, { page: null })), env).replaceAll('Your account | Mlezi', 'Page not found | Mlezi')
  await writeFile('dist/404.html', notFound)
  const { robots, sitemap } = crawlerFiles(env)
  await writeFile('dist/robots.txt', robots)
  await writeFile('dist/sitemap.xml', sitemap)
  console.log(`Pre-rendered ${PUBLIC_PAGES.length} public pages; search indexing ${config.indexable ? 'enabled for ' + config.origin : 'disabled for this build'}.`)
} finally { await server.close() }
