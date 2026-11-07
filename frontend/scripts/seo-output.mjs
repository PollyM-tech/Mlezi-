import { APP_PATHS } from '../src/lib/routes.js'
import { PUBLIC_PAGES, siteConfig } from '../src/lib/public-pages.js'
import { structuredData, jsonForHtml, SOCIAL_IMAGE, SOCIAL_IMAGE_ALT } from '../src/lib/seo.js'

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
    '<meta property="og:locale" content="en_KE">',
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
    ...(canonical ? [`<link rel="canonical" href="${escape(canonical)}">`, `<meta property="og:url" content="${escape(canonical)}">`, `<meta property="og:image" content="${escape(origin + SOCIAL_IMAGE)}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', '<meta property="og:image:type" content="image/png">', `<meta property="og:image:alt" content="${escape(SOCIAL_IMAGE_ALT)}">`, `<meta name="twitter:image" content="${escape(origin + SOCIAL_IMAGE)}">`, `<meta name="twitter:image:alt" content="${escape(SOCIAL_IMAGE_ALT)}">`] : []),
    ...(canIndex && env.VITE_GOOGLE_SITE_VERIFICATION ? [`<meta name="google-site-verification" content="${escape(env.VITE_GOOGLE_SITE_VERIFICATION)}">`] : []),
    ...(canIndex && env.VITE_BING_SITE_VERIFICATION ? [`<meta name="msvalidate.01" content="${escape(env.VITE_BING_SITE_VERIFICATION)}">`] : []),
    ...(structuredData(page, env) ? [`<script id="mlezi-structured-data" type="application/ld+json">${jsonForHtml(structuredData(page, env))}</script>`] : []),
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
