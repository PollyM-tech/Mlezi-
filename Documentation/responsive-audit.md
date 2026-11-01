# Responsive website audit — 1 November 2026

The website was checked in real headless Chromium, Firefox and WebKit engines using emulated viewport/touch settings. This covers common device sizes; it is not a claim that every physical phone, operating system, keyboard or assistive technology has been tested.

## Coverage and results

All 16 browser/viewport projects passed, each checking 19 screens: **304 screen/viewport combinations**. Another 14 checks just above CSS breakpoints passed. No document-wide horizontal scrolling or browser JavaScript exceptions remained in these checks. Visible mobile form fields were checked for text at least 16px.

| Engine | CSS viewport sizes |
| --- | --- |
| Chromium | 320×568, 360×844, 390×844, 600×1024, 768×1024, 820×1024, 1024×900, 1280×900, 1440×900, 1920×900 |
| Chromium landscape | 844×390 |
| Firefox | 360×800, 1366×768 |
| WebKit | 390×844, 820×1024, 1440×900 |
| Additional Chromium breakpoint checks | Home and caregiver signup at widths 581, 601, 651, 801, 901, 1051 and 1451px |

Screens: homepage; caregiver and employer signup; sign-in; caregiver workspace and profile editing; public caregiver profile; discovery and shortlist; employer contacts and account details; identity; membership; signed-in support and its conversation; privacy/account deletion; administrator workspace; privacy notice; regional guide; guest support. Checks also open the mobile menu, FAQ panel and advanced discovery filters, and inspect the cookie notice. Representative phone/desktop screenshots were reviewed and saved under the ignored `frontend/test-results/responsive/` folder.

## Fixes

- Regional-guide calls to action now wrap rather than extending beyond a 320px phone screen.
- Mobile/tablet inputs, dropdowns and textareas use 16px text, including the FAQ assistant and homepage search controls.
- Mobile text buttons have a 44px minimum height.
- Existing intentional workspace-navigation scrolling remains within its own container; page-wide overflow is not hidden to conceal layout failures.

Existing UI tests (66), lint and the production build passed. The production asset output was checked to ensure the responsive mock data and test APIs were not bundled.

## Repeat the audit

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run test:responsive
```

The dedicated test configuration starts a separate Vite server on port 4191. It renders the real application components with clearly labelled sample account/profile/ticket data, replaces API/auth hooks only in that server, blocks external browser requests and rejects attempted writes. It sends no authentication email, makes no payments and modifies no live accounts or identity files. The production build and normal Vite configuration do not enable these mocks. Browser reports, traces and screenshots are ignored by Git and lint.

The command creates an HTML report under `frontend/responsive-report`. The agent's successful matrix used the line reporter; stale reports from early failed runs were removed. The temporary test server was not deployed.

This execution environment needed browser runtime libraries extracted under `/tmp`; WebKit's temporary launcher was adjusted to preserve those library paths. Its host-wide dependency precheck was skipped after verifying the engine could actually render. This does not validate media codecs, hardware cameras or browser installation on a user's device. No system packages were installed. On a supported local/CI OS, use Playwright's normal browser/dependency installation above.

Before public launch, check an actual Android phone and iPhone/iPad for keyboard appearance, file/camera selection, dynamic browser bars, orientation changes and the real authenticated flows. The responsive fixtures intentionally do not validate live Resend delivery, Turnstile, identity processing or payments.

References: [Playwright device/viewport emulation](https://playwright.dev/docs/emulation), [browser installation and supported engines](https://playwright.dev/docs/browsers).
