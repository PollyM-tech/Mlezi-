# Cookie and browser-storage preferences

Implemented 23 October 2026 across the landing page and all application screens.

## Visitor choices

New visitors see equally prominent **Decline optional cookies** and **Accept
optional cookies** buttons. Browsing, registration, sign-in, server-side saved
shortlists, and existing contact access remain available after declining.

A persistent **Cookie settings** button allows acceptance or withdrawal later.
Opening settings focuses the panel heading; closing it returns focus to the
settings button. The banner is a non-modal, labelled region with mobile sizing
and expandable explanations. It does not lock the rest of the page.

## Essential versus optional

| Purpose | Storage / request | Behavior |
| --- | --- | --- |
| Remember consent | `mlezi-cookie-consent` cookie | Essential choice record; 180 days; values `v1.accepted` or `v1.declined` |
| Sign-in recovery | Existing `mlezi-session` refresh token in sessionStorage | Available regardless of optional choice; tab-scoped |
| Remember search | Existing `mlezi-search-*` sessionStorage records | Read/written only after acceptance; removed on decline |
| External fonts | Google Fonts stylesheet and resulting font requests | Requested only after acceptance; otherwise local fallback fonts |
| Caregiver photos and app API requests | Normal requested application resources | Remain available; these are not optional analytics |
| Analytics / advertising | None currently integrated | No trackers added by this change |

The consent cookie is host-only, uses `Path=/`, `SameSite=Lax`, and receives
`Secure` on HTTPS. It contains a choice/version, no user identifier or credential.
Missing, malformed, or outdated choices disable optional features by default.
The sign-in storage design is unchanged; this change does not migrate JWTs into
cookies or implement cookie-based authentication.

Accepting does not authorize unspecified future trackers. If the set of optional
purposes changes, update the disclosure and consent version before enabling them.
The unconditional CSS Google Fonts import was removed; accepted consent adds a
single stylesheet link instead. Declining removes that link and saved searches,
without deleting sign-in tokens or server-side shortlists. Prior font requests
cannot be undone, and downloaded font data may remain in the browser cache.

If a browser blocks saving a choice, the panel explains the failure and offers a
way to continue. Optional features are disabled for the current page even if an
older accepted cookie cannot be overwritten. The earlier saved preference may
return after reload when saving is blocked; the UI explains this limitation.

## Verification

- Eight consent unit tests plus the existing eleven search/session tests passed.
- Frontend build and lint passed.
- Chromium checks cover initial default-off behavior, decline persistence,
  browsing without search persistence, registration/session recovery after decline,
  settings/focus and acceptance, acceptance persistence, revocation without logout,
  the 390-pixel mobile layout, blocked cookie storage, and blocked overwriting of
  a prior acceptance.
- Browser testing uses isolated QA accounts/databases and intercepts optional
  Google font requests, avoiding real external font traffic during the tests.
- Temporary screenshots: `/tmp/mlezi-browser-qa/cookies-desktop.png` and
  `/tmp/mlezi-browser-qa/cookies-mobile.png`.

Run from `frontend`:

```bash
node tests/consent.test.mjs
node tests/search.test.mjs
node tests/api.test.mjs
npm run build
npm run lint
```

When repeating the employer browser journey, accept optional use to test search
restoration after leaving a results page. After declining, filters still work on
the current screen, but optional restoration across page changes is disabled.


Convex authentication uses essential per-tab session storage under its own
namespace. Registration drafts hold only role/name/phone, never passwords, and
are cleared after completion. Declining optional storage does not block sign-in
or email recovery. Transactional authentication emails do not add website
analytics or advertising trackers.
