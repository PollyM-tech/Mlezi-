# Mlezi public landing page

Implemented 23 October 2026 in the existing React/Vite app. This is a local
application change; no separate Site, hosting deployment, or backend change was
created. M-Pesa setup and live payment testing remain deferred.

## Public experience

The root URL now shows a public landing page for signed-in and signed-out visitors.
It uses the official `src/assets/logo.png` and existing correctly typed favicon,
with Mlezi's green/gold palette and an original inline SVG care illustration.
The illustration is decorative artwork, not a real caregiver or testimonial.

Sections include the hero and care-search starter, category discovery, how Mlezi
works, identity/reputation/Premium distinctions, a caregiver invitation, pricing,
FAQs and a final family/caregiver call to action. No user counts, testimonials,
background-check guarantees, or immediate payment availability are fabricated.
The pricing copy shows approved rates and clearly states M-Pesa activation is
coming next. Free browsing, account creation, and profile creation are available.

The header provides desktop navigation and an accessible expandable mobile menu.
In-page navigation scrolls without overwriting the application's hash route and
respects reduced-motion preferences. FAQ items expand using native details/summary.
The public landing page renders without requiring a backend connection.

## Routes and integration

| Route | Purpose |
| --- | --- |
| `/`, `#/`, `#/home` | Public landing page |
| `#/workspace` | Signed-in caregiver, employer, or admin workspace |
| `#/signin` | Sign-in form |
| `#/join?role=employer` | Registration open, employer/parent preselected |
| `#/join?role=caregiver` | Registration open, caregiver preselected |
| `#/browse?category=nanny&service_type=live_out` | Discovery with landing-page choices prefilled |

The category cards link to their category's discovery results. Search parameters
are cleaned with the existing allowlist before being used as filter state.
An empty search query continues to restore the existing per-user browser search.
Login/registration redirects to `#/workspace`; the logo returns to the public home.
A signed-in user opening a join link is redirected to their existing workspace,
without changing roles or creating a second account. Existing workspace navigation
uses `#/workspace` instead of the now-public root.

## Verification

- Frontend build and lint passed.
- All 11 existing frontend search/session tests passed.
- Nine Chromium landing-page checks passed: public root/logo, section scrolling,
  FAQ behavior, search presets, category links, caregiver signup link, employer
  registration/workspace/home navigation, mobile navigation/overflow, and rendering
  without backend access.
- All 13 employer browser regression checks passed with the new workspace route,
  including account editing, filters, shortlist persistence, privacy, stable
  pagination, error recovery, mobile layout, account isolation, and login/logout.
- QA used separate test servers on ports 5185/5055 and an isolated temporary
  database. Existing app servers and real user data were left untouched.
- Screenshots: `/tmp/mlezi-browser-qa/landing-desktop.png` and
  `/tmp/mlezi-browser-qa/landing-mobile.png`. They are temporary local artifacts.

External Google Fonts requests were blocked during deterministic browser QA;
the page has local serif/sans-serif fallbacks. Real-device accessibility and
production hosting checks remain release work.

## Cookie choices

The landing page now shares the application-wide Accept/Decline banner and
Cookie settings control. External Google Fonts and remembered searches are off
until accepted; sign-in remains available after declining. See
[cookie preferences](cookie-preferences.md).


## Sponsors and partners — 29 October 2026

The landing page includes a compact, responsive Sponsors & Partners section above
its footer, with a footer anchor link. Lintech is listed using the name supplied
by the owner. No website URL, sponsorship tier or additional endorsement is inferred.
The supplied Lintech Telecom logo is saved at
`frontend/src/assets/lintech-logo.png` and imported directly by the section. The artwork keeps its proportions and is included in pre-rendered HTML
through Vite's asset manifest on build.

Mylescorp Technologies is also listed under Sponsors & Partners using the supplied
`frontend/src/assets/mylescorp-logo.avif`. Both logos use matching responsive cards;
no external company URL is inferred.


## Rotating hero backgrounds — 1 November 2026

The landing-page hero now uses five supplied background images, starting with
`bg-image.png`, followed by the reading, playtime, block-building and healthcare
images. The byte-identical `Warm Mlezi Healthcare Bond (1).png` is not repeated;
all original files remain untouched. Logos are not part of this slideshow.

Backgrounds change every 10 seconds with a short crossfade and an overlay behind
the text. No buttons, counters or navigation controls are displayed. Rotation starts automatically,
pauses in hidden tabs to save resources, and resumes on return. Reduced-motion
CSS removes the fade while keeping the automatic ten-second image changes.

`HeroSlideshow.jsx` replaces the previous vector hero artwork; it affects only the
landing hero, leaving account forms and the lower-page content readable. The next
image is prefetched after initial paint, rather than downloading every slide at
once. These are the original PNGs, so image bandwidth still reflects their sizes.
The first background is included in pre-rendered HTML and uses Vite's asset map.
Timing, wraparound, automatic playback, visibility and cleanup have UI tests.

## Laptop review refinements and clean URLs

The care dropdowns start with “Select care type” and “Select work arrangement”, with native dropdown indicators and outlined controls. “Brighter” now uses an upright serif. Care-category cards no longer use decorative icons/arrows, and the public-review/Premium star and diamond were removed. Regional joining links use deep green with an underline. The five supplied background illustrations are restored and rotate automatically every 30 seconds, including the mother-and-children reading illustration. Original source assets are retained. Real photographs can replace it later when suitable licensed/consented images are supplied.

The application now uses browser paths: `/caregiver` and `/employer` for registration, `/signin`, `/caregivers`, `/caregivers/:id`, `/workspace`, `/shortlist`, `/contacts`, `/account`, `/identity`, `/membership`, `/privacy-account` and `/tickets`. Guest support stays at `/support/`. Old `/app/#/...` bookmarks and email links redirect to clean destinations while preserving codes and filter parameters. Browser Back/Forward and internal links use the History API. API/function paths and authorization rules have not changed.

The build produces noindex application shells for direct visits and refreshes. Vercel rewrites clean application and dynamic caregiver URLs to that shell; local preview applies the same application-shell routing and applies the existing security headers plus noindex headers to application routes. Private URLs stay out of the sitemap. Public editorial/regional pages retain their existing routes and metadata. Encoded asset filenames are resolved during pre-rendering.

Email/password registration, OTP and magic links still use the same Resend delivery service. Test mode clearly explains its recipient restriction; it is not bypassed. The confirmed test-recipient issue requires using the Resend-account email until the operator verifies a sending domain. These local changes have not been deployed, and domain/provider configuration remains an operator step.

Validation: 50 UI tests, 55 backend tests, nine routing/SEO/security configuration checks, lint and the production build passed. Local preview HTTP checks confirmed 200 responses with noindex application HTML and no public canonical URL for all 14 clean application/profile routes. Browser navigation tests cover entering signup from the homepage and returning with Back. No public deployment or live email request was made. Vercel routing follows its [documented rewrite configuration](https://vercel.com/docs/routing/rewrites); the hosted preview should be checked after deployment.

Latest signup update: every Create account method (password, magic link and OTP) collects role, full name and phone before requesting email verification. Returning sign-in asks only for email and the chosen authentication method. A 30-minute-valid registration draft carries details across method changes and same-browser magic-link tabs, matched against the authenticated email supplied by Convex. It is cleared after completion/sign-out; expired copies are removed when next accessed. Passwords and codes are never stored in the draft. If storage is unavailable or a different browser/device is used, the completion form remains available. The selected role overrides a signup page’s default; an existing account’s server-owned role is never changed by signing in.
