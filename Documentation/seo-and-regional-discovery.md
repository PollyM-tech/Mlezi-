# SEO and regional discovery

Implemented 29 October 2026. Convex remains the only application backend.

## Public search visibility

The build now pre-renders readable HTML for `/`, `/east-africa/`, `/kenya/`,
`/uganda/`, `/burundi/`, `/rwanda/`, `/privacy/`, `/cookies/`, `/terms/` and `/support/`.
Each has a title and description; a configured public origin also supplies canonical
and Open Graph URLs. The official Mlezi logo is retained. These are real linked
pages, rather than distinct content hidden behind hash fragments.

The country pages are English editorial guides. The current assumption is **families
hiring in Kenya, with caregivers able to join from across the region**. They do not
advertise local offices, a count of available workers, immigration services or jobs
in other countries. Do not add language alternates until actual translations exist.
The guides should be updated when the operational scope changes.

Private and interactive routes use `/app/#/...`. Old `/#/...` bookmarks and email
links redirect while preserving query parameters and sign-in codes. Account HTML
and host headers specify `noindex, nofollow`. The sitemap contains only the public
editorial pages, never individual profiles, employer contacts or identity evidence.
Index exclusion is not an access-control mechanism; Convex permissions still apply.

## Indexing and launch

Development and preview builds default to noindex and a robots file that disallows
crawling. Netlify non-production contexts and Vercel previews force indexing off.
Before building the reviewed production release:

1. Choose the real domain and legal operator; configure guest support; finish the existing
   production readiness requirements. The owner has chosen `mlezicare.com`; hosting, DNS, email and launch checks are still pending.
2. Set `VITE_APP_ORIGIN=https://mlezicare.com` and `VITE_SITE_INDEXABLE=true` in
   the production build environment only. The origin must have no path or credentials.
3. Run `npm run build:production` from `frontend`. Publish `dist` on the configured
   Netlify/Vercel host. Keep its security and private-route headers. Do not configure
   a universal HTTP-200 rewrite that masks missing public pages.
4. Check a public page's HTML, canonical URL and actual HTTP status. Confirm that
   `/robots.txt` allows the public pages and points to `/sitemap.xml`, and that
   `/app/` remains noindex. Preview pages must remain noindex.
5. Verify domain ownership in Google Search Console, submit `/sitemap.xml`, and
   inspect the home and regional URLs. Monitor coverage and actual search terms.
   Bing Webmaster Tools can receive the same sitemap.

SEO cannot guarantee indexing, ranking or inclusion for every search. Avoid country
doorway pages, repeated keyword lists, invented reviews or fake office addresses.
Write useful local content and link from relevant legitimate partner pages. There
are no new analytics/advertising trackers; cookie choices remain unchanged.

## Local vocabulary and discovery

Kenyan copy acknowledges **maid, maids, househelp, house help and domestic worker**.
The product currently offers childcare categories. It does not claim every nanny
also offers cleaning, laundry or general household work. A separate general
househelp category and its duties remain a product-scope decision.

Keyword search now searches stated category, services, skills, languages, general
location and profile text. Tokens can match across those fields. It normalizes
case, accents, common plurals, the household synonyms above, Swahili/Kiswahili and
French/français. Household synonyms match profiles that actually state that work;
they do not automatically match all nannies. Partial names/towns require at least
three characters. Query length and bounded database reads remain enforced.

Language choices now include Kirundi, Kinyarwanda, Luganda and French alongside
English, Kiswahili and Kenyan Sign Language. Languages are self-reported. No
nationality, work eligibility or residence is inferred from language. Country of
residence and destination-country filters have not been introduced; existing
profiles have not been assigned invented country data.

Search still excludes unavailable, suspended, unapproved, underage/unconfirmed
and photo-less profiles. Explicit employer filters apply before Premium priority.
Matching Premium profiles rotate hourly for fair exposure; Premium cannot bypass
filters or identity review. Keyword synonyms change matching, not trust badges or
ratings. The existing 500-candidate bound remains a scaling follow-up.

## Verification

`npm run test:seo` covers metadata, canonical/sitemap privacy, staging noindex,
legacy route preservation, regional keywords and household synonyms. The UI suite
covers public versus private entries. Convex integration tests verify that synonym
matching still respects language/category filters and adult visibility.

Official references:

- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google regional and language versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## SEO completion update — 7 November 2026

The public-page renderer now emits Organization, WebSite and WebPage JSON-LD,
with BreadcrumbList on the guide, support and notice pages. It contains no
invented locations, ratings, jobs or availability. Private routes and previews
receive no public structured data. Client navigation refreshes descriptions,
sharing metadata and canonical URLs and clears public metadata on private views.

Every public page has its own description and uses the new 1200 × 630 branded
social card. Marketing images use optimized WebP copies; originals are retained.
Regenerate the assets with `npm run assets:marketing` after changing an original.

Build and verify the indexable release from `frontend`:

```sh
npm run test:seo
VITE_APP_ORIGIN=https://mlezicare.com VITE_SITE_INDEXABLE=true npm run build
```

Set those same two public variables in the Vercel **Production** environment.
Do not set them globally for previews. Publish the updated source using the
existing GitHub/Vercel workflow, then run:

```sh
npm run seo:check:live -- https://mlezicare.com
```

This checks the deployed public canonicals, indexing, structured data, sharing
image, sitemap coverage, private-page exclusions and real HTTP 404 responses.
It will report missing changes until this release is actually deployed.

### Google Search Console ownership and submission

1. Sign in at https://search.google.com/search-console with the Google account
   that will manage Mlezi's search presence.
2. Add the **Domain** property `mlezicare.com`. Copy Google's supplied DNS TXT
   verification record into the domain's DNS zone, then click Verify. The exact
   verification value must come from Google; do not invent one.
3. Alternatively, add the **URL prefix** property `https://mlezicare.com/` and
   select HTML tag verification. Save only the supplied tag's `content` value
   as `VITE_GOOGLE_SITE_VERIFICATION` in the Vercel Production environment,
   rebuild/deploy, and click Verify. Keep the value after verification.
4. Under Sitemaps, submit `https://mlezicare.com/sitemap.xml`.
5. Use URL Inspection for `/`, `/kenya/` and the regional guides, run the live
   inspection and request indexing. Inspect any errors rather than repeatedly
   resubmitting. Individual profiles and account pages are intentionally excluded.
6. Monitor Pages, Performance, Core Web Vitals and security/manual-action reports.

Bing is optional: add the site in Bing Webmaster Tools and either import the
verified Search Console property or set the supplied HTML verification token
as `VITE_BING_SITE_VERIFICATION`, rebuild/deploy and submit the same sitemap.
No advertising or analytics trackers were added by this SEO work.
