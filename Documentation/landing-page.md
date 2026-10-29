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
