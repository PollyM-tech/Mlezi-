# Employer browser acceptance test — 23 October 2026

Completed against the local Flask/React application using headless Chromium,
with a 1440 × 1000 desktop viewport and a 390 × 844 mobile viewport.

All 13 checks passed. Two employer accounts were registered through the actual
web interface in an isolated temporary SQLite database seeded with sample
caregivers. Real user accounts, caregiver profiles, Cloudinary documents, and
payment records were not changed. M-Pesa was disabled for the test server.

## Passed checks

1. Register Employer / parent through browser and reach private dashboard.
2. Official logo and favicon load.
3. Edit private account and retain changes after reload.
4. Search category, live-out location, pay period, skill, day and identity filters.
5. Save from search, view profile, keep contacts private, restore filters on return.
6. Shortlist persists after reload and removal works.
7. Clear filters and paginate with stable ordering.
8. No-match results and clear-filter recovery.
9. New employer has no unlocked contacts and no payment bypass.
10. Search service error displays a retry and recovers.
11. Mobile overview, browse and account fit the viewport.
12. Second employer cannot see first employer’s account or shortlist.
13. Sign out, reject incorrect password, sign in and restore saved caregiver.

## Scope and evidence

No application JavaScript page errors were observed during the final run.
The search-error check deliberately returned HTTP 503 and verified retry recovery.
The incorrect-password check deliberately returned HTTP 401. External Google
Fonts requests were blocked for deterministic local interaction testing.

Temporary screenshots and the machine-readable report were saved under
`/tmp/mlezi-browser-qa/`: `employer-overview.png`, `employer-search.png`,
`employer-mobile.png`, and `report.json`. These are temporary local artifacts.

The temporary test servers were stopped after testing. No application source
fix was needed for the final passing run; test selectors were adjusted to match
helper text in form labels and distinguish navigation links from dashboard links.

This verifies employer registration and the free account/search/shortlist journey.
It does not verify live payments, paid contact activation, real-device mobile
behavior, or full screen-reader accessibility. M-Pesa remains the final stage.
