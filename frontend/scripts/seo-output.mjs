import { APP_PATHS } from '../src/lib/routes.js'
import { PUBLIC_PAGES, siteConfig } from '../src/lib/public-pages.js'

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

export function renderDocument(template, page, markup, env) {
  const { origin, indexable } = siteConfig(env)
  const canIndex = Boolean(indexable && page)
  const title = page?.title || 'Your account | Mlezi'
  const description = page?.description || 'Sign in to your private Mlezi account.'
  const canonical = origin && page ? origin + page.path : ''
  const metadata = [
    `<meta name="robots" content="${canIndex ? 'index, follow' : 'noindex, nofollow'}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Mlezi">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta name="twitter:card" content="summary">`,
    ...(canonical ? [`<link rel="canonical" href="${escape(canonical)}">`, `<meta property="og:url" content="${escape(canonical)}">`, `<meta property="og:image" content="${escape(origin)}/favicon.png">`, '<meta property="og:image:alt" content="Mlezi logo">'] : []),
  ].join('\n    ')
  return template.replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${escape(description)}">`)
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, '')
    .replace('</head>', `${metadata}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
}

export function crawlerFiles(env) {
  const { origin, indexable } = siteConfig(env)
  return {
    robots: indexable ? `User-agent: *\nAllow: /\nDisallow: /app/\n${Object.keys(APP_PATHS).map(path => `Disallow: ${path}`).join('\n')}\nDisallow: /app\n\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n',
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable ? PUBLIC_PAGES.map(page => `\n  <url><loc>${escape(origin + page.path)}</loc></url>`).join('') : ''}\n</urlset>\n`,
  }
}
