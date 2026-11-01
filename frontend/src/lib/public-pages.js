import { appRoute, appHref } from './routes.js'
// Public editorial pages only. Never add accounts, contacts or identity evidence here.
export const PUBLIC_PAGES = [
  { path: '/support/', title: 'Support & private help tickets | Mlezi', description: 'Get help with your Mlezi account, profile or technical issue. Open a private support ticket or check replies without sharing the operator’s personal contact details.' },
  { path: '/', title: 'Mlezi | Nannies, babysitters & family care in Kenya', description: 'Find childcare that fits your family in Kenya. Explore nannies, babysitters, live-in care and travel nannies, with clear identity checks and employer reviews.' },
  { path: '/east-africa/', title: 'Caregiver connections in East Africa | Mlezi', description: 'A guide for families in Kenya and caregivers from Kenya, Uganda, Burundi and Rwanda: care arrangements, languages, identity review and joining Mlezi.', heading: 'Care connects us across East Africa.', intro: 'Mlezi starts with families hiring in Kenya and welcomes adult caregivers to describe their experience. This guide helps people from Kenya, Uganda, Burundi and Rwanda understand the marketplace.', sections: [
    ['Start with the work, not where someone comes from', 'Choose childcare experience, language, availability and the care arrangement your family needs. A country of origin does not tell you someone’s skills or suitability. Search results respect your filters, with clearly labelled Premium placement among matching caregivers.'],
    ['Agree a clear arrangement', 'Live-in, live-out, occasional, newborn and travel care involve different hours and duties. Discuss pay, rest time, accommodation and any travel costs directly before agreeing to work together.'],
    ['Joining from another country', 'A Mlezi account or an identity badge does not grant permission to work or travel. Confirm the requirements for the country where the work will take place. We do not promise cross-border placements, transport or immigration services.'],
  ] },
  { path: '/kenya/', title: 'Nannies, babysitters & househelp searches in Kenya | Mlezi', description: 'Looking for a nanny, babysitter or househelp in Kenya? Understand childcare duties, live-in and day nanny arrangements, identity review and how Mlezi works.', heading: 'Find the right care for your family in Kenya.', intro: 'Families in Kenya use words such as nanny, househelp, house help and maid when looking for help at home. On Mlezi, start with the actual duties you need, then compare each caregiver’s stated services.', sections: [
    ['A nanny, a maid or a househelp?', 'These words can describe different jobs. Mlezi currently focuses on childcare caregivers. Childcare experience does not automatically include general cleaning, laundry or cooking for the whole household. Confirm household duties separately with the person you are considering.'],
    ['Live-in or live-out care', 'A live-in arrangement includes living at the family’s home. A live-out or day nanny commutes to work. For live-out care, use the location filter to look for an area such as Nairobi, Mombasa or Kisumu; results depend on the caregivers actually listed.'],
    ['Compare care, not just a label', 'Choose newborn and maternity care, occasional babysitting, special needs care or travel childcare according to your family’s needs. Browse for free, review experience and public employer feedback, and interview before making an agreement.'],
  ] },
  { path: '/uganda/', title: 'Ugandan caregivers joining Mlezi | Care connections with Kenya', description: 'Information for caregivers from Uganda considering Mlezi: describe your childcare experience, languages, availability and work arrangements for families hiring in Kenya.', heading: 'For caregivers joining from Uganda.', intro: 'If you are in Uganda and considering childcare work with a family in Kenya, use Mlezi to describe what you actually offer. This is a joining guide, not a promise of available jobs or a local recruitment office.', sections: [
    ['Make your languages and experience clear', 'List the languages you speak, such as Luganda, English or Kiswahili, and explain your experience with infants, toddlers or older children. Families can use language and care filters when browsing.'],
    ['Describe where you can work', 'Give an accurate general location and availability. Discuss whether a role is live-in, live-out or involves family travel, and confirm any relocation arrangements directly. Do not publish your exact address or private documents in your bio.'],
    ['Prepare for identity review', 'Caregivers submit a profile photo, national ID image and recent selfie for administrator review. Public discovery requires approval and confirmation that the caregiver is at least 18. Eligibility to work in the destination country remains a separate requirement.'],
  ] },
  { path: '/burundi/', title: 'Caregivers from Burundi | Joining Mlezi for family care', description: 'A guide for caregivers from Burundi joining Mlezi: Kirundi and French language information, childcare experience, adult identity review and arrangements with families in Kenya.', heading: 'For caregivers joining from Burundi.', intro: 'Families and caregivers need a shared understanding of the work. If you are joining from Burundi, explain your childcare experience and the languages you use comfortably, including Kirundi, French, Kiswahili or English where applicable.', sections: [
    ['Help a family understand your skills', 'Describe the ages of children you have cared for, any newborn experience and the hours you are available. List only services and languages you can actually provide; no language or nationality guarantees a match.'],
    ['Agree duties in a shared language', 'Before accepting a role, discuss childcare tasks, expected pay, rest time, accommodation and communication with the family. A househelp or maid role may include duties different from a nanny role. Confirm the details instead of relying on the job title.'],
    ['Join safely and accurately', 'Identity documents and selfies are private review evidence, not public profile content. Mlezi does not promise relocation or employment. Check destination work requirements separately before travelling or accepting cross-border work.'],
  ] },
  { path: '/rwanda/', title: 'Caregivers from Rwanda | Joining Mlezi for childcare', description: 'Information for caregivers from Rwanda joining Mlezi: Kinyarwanda and other languages, childcare experience, travel nanny duties and identity review for adult caregivers.', heading: 'For caregivers joining from Rwanda.', intro: 'Joining from Rwanda? Build a profile around your childcare experience, availability and languages, such as Kinyarwanda, English, French or Kiswahili where applicable. Our initial hiring focus is families in Kenya.', sections: [
    ['Show the care you can provide', 'Choose your care category, the age groups you have experience with and the work arrangements you offer. Explain special skills in your bio and keep availability up to date so families can make informed choices.'],
    ['Travel care needs its own agreement', 'A travel nanny helps children during a family trip. Agree destinations, working hours, costs and accommodation before accepting. A travel-care profile is not an offer of overseas placement or a substitute for travel and work eligibility.'],
    ['Understand the trust signals', 'Identity checked follows administrator review and an adult age check. Premium is optional paid visibility within matching results; it does not purchase an identity badge, a better rating or a guarantee of work.'],
  ] },
  ...['privacy', 'cookies', 'terms'].map(type => ({ path: `/${type}/`, type, title: `${({ privacy: 'Privacy notice', cookies: 'Cookie policy', terms: 'Terms of use' })[type]} | Mlezi`, description: 'How Mlezi handles marketplace use, privacy, identity evidence and cookie choices.' })),
]

export function publicPage(pathname) {
  const path = pathname === '/' ? '/' : `/${pathname.replace(/^\/+|\/+$/g, '')}/`
  return PUBLIC_PAGES.find(page => page.path === path) || null
}

export function siteConfig(env = {}) {
  let origin = ''
  if (env.VITE_APP_ORIGIN) {
    const url = new URL(env.VITE_APP_ORIGIN)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /^(localhost|127\.|\[::1\])/.test(url.hostname)) throw new Error('SEO requires the actual public HTTPS origin, without a path or credentials.')
    origin = url.origin
  }
  const preview = env.VERCEL_ENV && env.VERCEL_ENV !== 'production' || env.CONTEXT && env.CONTEXT !== 'production'
  const indexable = env.VITE_SITE_INDEXABLE === 'true' && !preview
  if (indexable && !origin) throw new Error('Set VITE_APP_ORIGIN before enabling search indexing.')
  return { origin, indexable }
}

// Preserve legacy email codes, filters and bookmarks while removing hash URLs.
export function entryRoute({ pathname, hash = '', search = '' }) {
  const legal = hash.match(/^#\/(privacy|cookies|terms)(?:\?|$)/)
  if (legal) return { redirect: `/${legal[1]}/${search}` }
  if ((pathname === '/' || /^\/app\/?$/.test(pathname)) && hash.startsWith('#/')) {
    if (['#/', '#/home'].includes(hash)) return pathname === '/' ? {page: publicPage('/')} : {redirect: '/'}
    const destination = appHref(hash)
    if (destination) {
      const url = new URL(destination, 'https://mlezi.local')
      for (const [key,value] of new URLSearchParams(search)) url.searchParams.set(key,value)
      return {redirect: url.pathname + url.search}
    }
  }
  if (pathname === '/' && new URLSearchParams(search).has('code')) return {redirect: `/signin${search}`}
  if (/^\/app\/?$/.test(pathname)) return {redirect: `/signin${search}`}
  if (appRoute({pathname, search})) return {private: true}
  return { page: publicPage(pathname) }
}
