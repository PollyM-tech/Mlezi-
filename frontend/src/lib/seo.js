import { siteConfig } from './public-pages.js'

export const SOCIAL_IMAGE = '/social-card.png'
export const SOCIAL_IMAGE_ALT = 'Mlezi — nannies, babysitters and family care in Kenya'

export function structuredData(page, env) {
  const { origin, indexable } = siteConfig(env)
  if (!origin || !indexable || !page) return null
  const website = `${origin}/#website`, organization = `${origin}/#organization`, url = origin + page.path
  const graph = [
    { '@type': 'Organization', '@id': organization, name: 'Mlezi', url: `${origin}/`, logo: { '@type': 'ImageObject', url: `${origin}/apple-touch-icon.png` }, description: 'A marketplace connecting families and adult caregivers in Kenya.' },
    { '@type': 'WebSite', '@id': website, url: `${origin}/`, name: 'Mlezi', inLanguage: 'en', publisher: { '@id': organization } },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'en', isPartOf: { '@id': website }, about: { '@id': organization }, ...(page.path !== '/' ? { breadcrumb: { '@id': `${url}#breadcrumbs` } } : {}) },
  ]
  if (page.path !== '/') graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumbs`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Mlezi', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: page.heading || page.title.split(' | ')[0], item: url },
  ] })
  return { '@context': 'https://schema.org', '@graph': graph }
}

export const jsonForHtml = value => JSON.stringify(value).replace(/</g, '\\u003c')

export function updatePageMetadata(document, page, env, currentOrigin) {
  const { origin, indexable } = siteConfig(env)
  const title = page?.title || 'Your account | Mlezi'
  const description = page?.description || 'Sign in to your private Mlezi account.'
  const publicOrigin = Boolean(origin && origin === currentOrigin && page)
  const setMeta = (attribute, name, content) => {
    let tag = document.head.querySelector(`meta[${attribute}="${name}"]`)
    if (content === null) { tag?.remove(); return }
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.appendChild(tag) }
    tag.setAttribute('content', content)
  }
  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', publicOrigin && indexable ? 'index, follow' : 'noindex, nofollow')
  for (const [key, value] of Object.entries({ 'og:title': title, 'og:description': description, 'og:url': publicOrigin ? origin + page.path : null, 'og:image': publicOrigin ? origin + SOCIAL_IMAGE : null })) setMeta('property', key, value)
  for (const [key, value] of Object.entries({ 'twitter:title': title, 'twitter:description': description, 'twitter:image': publicOrigin ? origin + SOCIAL_IMAGE : null })) setMeta('name', key, value)
  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (publicOrigin) {
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = origin + page.path
  } else canonical?.remove()
  document.getElementById('mlezi-structured-data')?.remove()
  const data = publicOrigin ? structuredData(page, env) : null
  if (data) { const tag = document.createElement('script'); tag.id = 'mlezi-structured-data'; tag.type = 'application/ld+json'; tag.textContent = jsonForHtml(data); document.head.appendChild(tag) }
}
