# Employer / parent workspace

Implemented 23 October 2026 using the existing Flask API and React application.
M-Pesa setup and live payment testing remain deferred to the final stage. No
new schema migration, sample accounts, contact grants, or local data changes were
needed for this workspace milestone.

## Employer journey

1. Choose **Create account → Employer / parent**. Enter a name, email, phone,
   and password. Employer registration is free.
2. Sign in to a private overview showing saved-caregiver, unlocked-contact, and
   review counts. An employer is never listed in the public caregiver directory.
3. Use **Find caregivers** to search public profiles. Filter by keyword, care
   category, work arrangement, relevant location, minimum experience, pay period
   and budget, available day, skill, minimum rating, and identity-check status.
4. Save profiles from results or profile details. **My shortlist** persists
   across reloads and sign-ins and is visible only to that employer.
5. Open a profile to read details and public reviews. Returning with **Back to
   caregivers** restores the last successful search in the current tab when
   optional cookie/browser-storage use has been accepted.
6. Use **My contacts** to revisit contacts already unlocked by this employer.
   These remain accessible after the contact-access pass expires. New unlocks
   still require an active pass; no payment bypass was added.
7. Use **My account** to update private name and phone. Email is read-only here.
   Review forms suggest the employer's first name; only the first name is
   published with a review.

Existing employer accounts without names can set a name in My account. Name is
optional in the registration API for backward compatibility and required by the
new employer signup screen. No public employer-profile endpoint exists.

## New API endpoints

All require an employer access token. Identity comes from the token, never a
user ID supplied in a URL/query or body.

| Method | Path | Response / behavior |
| --- | --- | --- |
| GET | /api/employers/dashboard | Own account, counts, current pass state |
| GET | /api/employers/profile | Own private name, email, phone and pass expiry |
| PUT | /api/employers/profile | Only `name` and `phone`; validates both merged fields |
| GET | /api/employers/contacts?page=1 | Own previously unlocked contacts, newest first, 12 per page |

Writes cannot change email, user/role identifiers, pass expiry, or paid status.
Public caregiver/profile responses continue to exclude contact fields and
private document references. The private contacts endpoint includes only
caregivers with an existing unlock owned by the authenticated employer.

## Search behavior

Existing `GET /api/caregivers` now supports:

- `q`: name/bio keyword, up to 120 characters.
- `category` and `service_type`: existing supported category/arrangement values.
- `location`: case-insensitive area/town matching when `service_type=live_out`.
  The UI disables this field for other arrangements; it does not filter live-in care.
- `min_experience`: minimum whole years.
- `pay_max`: maximum caregiver minimum expected pay; requires `pay_period`.
- `pay_period`: `monthly`, `daily`, or `hourly`; budgets never compare different periods.
- `available_day`: Monday through Sunday; caregiver must list that day.
- `skill`: exact skill label from the caregiver's skills list.
- `min_rating`: 0–5, finite numbers only. Positive thresholds exclude unrated profiles.
- `identity_checked=true`: only profiles with admin-set `verification_status=verified`.
- Existing `page`, `per_page`, and signed `rotation` pagination parameters.

All selected filters apply before Premium ranking. Search choices, page, and
rotation are saved per signed-in user (or anonymous browser) in sessionStorage
only after optional consent. Declining clears these remembered searches without
removing server-side shortlists or sign-in storage. See
[cookie preferences](cookie-preferences.md).
Expired search sessions retain choices but reset pagination/ranking. Storage
failures do not prevent browsing. Search tokens are reused for pagination so
normal next/previous navigation doesn't rerandomize the Premium tier.

Loading, no-results, empty-shortlist/contact, validation, network error, and retry
states are provided. Result cards display expected minimum pay with its period,
identity state, Premium placement, and public rating/count. Missing photos are
not fabricated and no test caregivers were added to the real database.

## Validation

Backend tests use an in-memory database for registration names, account validation,
private data isolation, role enforcement, free/idempotent shortlisting, own-contact
retrieval after expiry, counters, pay-period comparisons, availability, skills,
keywords, identity/rating filters, and live-out location behavior.

Run from `backend`:

```bash
.venv/bin/python -m unittest discover -s tests -q
```

Run from `frontend`:

```bash
node tests/search.test.mjs
node tests/api.test.mjs
npm run build
npm run lint
```

The employer journey passed 13 Chromium browser checks on desktop and a
390-pixel mobile viewport; see [browser QA results](employer-browser-qa.md).
A real-device check is still useful. To repeat the acceptance journey:
create an employer account → overview → account edit → search/filter → save a
caregiver → reload shortlist → view profile → back to restored results → remove
from shortlist. Confirm that a second employer cannot see those saved profiles.
Contacts should be empty until actually unlocked through the protected flow;
there is no automatic trial pass or free contact-access grant.

## Browse-first update — 3 November 2026

The employer workspace includes available caregivers immediately after sign-in, with
filters initially collapsed. `/caregivers` starts with no filters and page one. An
explicit homepage/shared-link query is still honored. Optional remembered searches
are applied only through **Use last search**, never silently on a new browse visit.
Clear filters / Show all available caregivers restores the unfiltered list.

Following the operator's decision, complete available pending-review profiles may
also appear and be shortlisted. They need recorded adult-account terms acceptance,
a stored profile photo, ID and selfie, and a current pending submission matching the
photo. Their status is explicitly pending and age/identity are not confirmed. They
receive no Identity checked badge and cannot have contacts unlocked until adult
identity approval. Rejected, incomplete, suspended and deletion-pending profiles stay
hidden. Identity checked only excludes pending profiles. Private ID, selfie and
contact data are never included in listing/detail projections.

This supersedes earlier notes about automatic saved-filter restoration and
approved-only publication. Filters still apply before Premium ranking. Empty-market
and no-filter-match messages are now distinct. Deploy both Convex and frontend changes
before retesting the browse/search journey live.

## Employer-only browsing — 3 November 2026

Caregiver listings, individual profile details and reviews now require a verified,
active employer account. Anonymous homepage visitors see marketing information and
employer sign-in/create-account links, never real caregiver cards. Direct visits to
`/caregivers` or a profile URL show an access gate without fetching profile data.
The backend independently rejects anonymous requests and non-owner caregiver access;
this is not just client-side hiding. A caregiver may preview their own profile and
reviews. Authorized administrator access still requires MFA.

The browse-first and pending-review rules above apply **after employer sign-in**.
They do not make listings public to the internet. Contact payment and identity checks
are unchanged. Public caregiver URLs remain noindex application shells. This policy
supersedes earlier references to anonymous/public discovery in implementation notes.
Deploy Convex authorization changes as well as the frontend to enforce it live.

## Job proposals and offers (3 November 2026)

The `/jobs` workspace now supports employer job posting, caregiver pay/message proposals, identity badges, employer offers and caregiver acceptance. Pending-review caregivers may apply; adult identity approval is required before confirming a hire. Confirming a new contact requires the existing contact-access pass. Visibility remains the caregiver’s independent choice. See [Jobs marketplace implementation and testing](jobs-marketplace.md). These additions are local until the frontend and Convex functions/schema are deployed together.
