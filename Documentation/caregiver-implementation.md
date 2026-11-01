# Caregiver account and profile milestone

**26 October 2026 security/age-policy update:** Caregiver-only photo gating and three-image identity submission are enforced. Employer publication/contact access requires an administrator-confirmed 18+ identity check; uploads alone do not verify age. Admin TOTP, upload sanitization/quotas, privacy requests/deletion, audit and retention controls are implemented on Convex. See [current implementation, tests and remaining production blockers](production-security-implementation.md). Earlier API/staged implementation details below are historical where they differ.


Implemented 23 October 2026 using Flask, SQLAlchemy, and React. No schema changes
or local data migrations are required for this milestone.

## Delivered

- Caregiver registration and login UI connected to the existing authentication API.
- Session restore, access-token refresh, sign out, and expired-session handling.
- Profile creation with public photo and privately stored national ID.
- Owner profile retrieval and editing, including optional photo replacement.
- Availability as a list of weekday names and skills as a list of short strings.
- Private contact phone editing; contact details excluded from public serialization.
- Responsive caregiver workspace and public profile preview.
- Validation, upload-size limits, and best-effort asset cleanup after failures.

## API contract

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | /api/caregivers/profile | Caregiver, one profile per account |
| GET | /api/caregivers/profile | Current caregiver only |
| PUT | /api/caregivers/profile | Current caregiver only |
| GET | /api/caregivers/:id | Public, no phone/email or private document references |
| PUT | /api/caregivers/:id | Profile owner only |

Writes use multipart form data. PUT accepts partial updates and validates the
merged profile, including pay bounds and live-out location. Unknown fields cannot
change verification status, featured status, ownership, or private asset IDs.
Only the owner response includes `phone` and `national_id_uploaded`.

`service_types`, `availability`, and `skills` are JSON-encoded arrays in multipart
requests. Availability accepts Monday through Sunday. Empty skills and
availability arrays are allowed. Profile photos and national ID images accept
JPEG, PNG, and WebP, up to 5 MB per file and 12 MB per request. Signature and MIME
checks happen locally; Cloudinary performs actual image processing.

Photo replacement uploads the new asset before committing; the old asset is
removed only after successful persistence. Failed uploads/database writes trigger
best-effort cleanup. Self-service national ID replacement is rejected to avoid
invalidating reviewed documents outside an admin workflow.

## Decisions aligned with existing implementation

- National ID and photo are compulsory for creating a profile. Uploading ID does
  not grant a verified badge. This supersedes the original document's optional-ID
  onboarding description for this milestone.
- Multiple `service_types` replace `employment_type`.
- Curriculum was removed by the existing migration; it is not offered as a field.
- Identity checks now include caregiver selfie submission, private admin document access, approval or rejection, and correction reasons. Identity checking stays separate from paid Premium membership and public ratings.

## Validation and remaining work

Run backend integration tests with `python -m unittest discover -s tests -v`
inside the backend virtual environment. Frontend checks are documented in its
README. All test accounts and uploads are isolated/mocked; the existing local
account is preserved. The caregiver browser journey is covered with isolated accounts and simulated uploads. Live Cloudinary upload and private document delivery still need a manual end-to-end check with development documents.

This completes the account/profile journey, not the entire caregiver product.
Admin identity checks, password recovery, and account/data deletion remain
separate work. Yearly Premium membership, employer payments/contact access,
search, and public employer reviews are now implemented in the marketplace
milestone; live M-Pesa sandbox testing remains outstanding. Production work
includes authentication hardening, approved CORS origins, deployment and backups.

## Expanded caregiver options

Caregiver categories now include travel nanny, on-call/occasional babysitter,
breastfeeding support, overnight sleep training, special needs nanny, and
newborn & maternity/night nanny. The latter covers infant care and support
during postpartum recovery. Existing nanny, babysitter, educator, and other
categories remain supported.

The primary category is selected once; caregivers can choose several services
and work arrangements. Live-in and live-out remain work arrangements. Live-out
is labelled “Live-out / day nanny (daybags)” and described as commuting to and
from the family’s home daily on a fixed schedule; location remains compulsory.
Existing service values are preserved, so existing profiles need no migration.
Care specialties are self-described and do not confer verification or credentials.

## Cloudinary upload permissions troubleshooting

A successful Cloudinary ping verifies connectivity/credentials, but not upload
permissions. On 23 October, generated-image diagnostic uploads to both public and
authenticated storage returned `NotAllowed`, reporting missing `create`
permissions. No diagnostic assets were created.

In Cloudinary Console, select the correct product environment and review
Settings > API Keys. The backend key must authorize uploading to the profile-photo
and national-ID folders, including authenticated images. It also needs deletion
permission for photo replacement and failed-write cleanup. If the environment
uses restricted roles/shared folders, have its administrator grant the appropriate
access or issue a backend key with that access.

If replacing credentials, update `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` in `backend/.env` as appropriate, then restart Flask.
Never place secrets in frontend files or chat. Do not make ID assets public or
switch to unsigned uploads as a workaround.

Authorization failures now return HTTP 502 with code
`document_storage_access_denied`. Server logs show upload stage and exception
class, plus a configuration hint, without logging raw provider errors or secrets.
After the role was changed to Master Admin, public photo and authenticated ID
uploads both passed a generated-image retest, and diagnostic assets were deleted.
The user subsequently confirmed the caregiver profile section was complete.


## Approved commercial and ranking rules — 23 October 2026

These approved rules are now implemented in the marketplace code. M-Pesa
configuration and live sandbox testing remain outstanding. See
[marketplace implementation notes](marketplace-implementation.md). See [technical documentation, section 13](nanny-marketplace-technical-doc.md#13-business-rules--monetization)
for the full business rules and public review policy.

| Decision | Approved rule |
|---|---|
| Employer fees | KES 300 for 30 days, or KES 500 for 90 days |
| Expired employer access | Previously unlocked contacts remain accessible; renew to unlock new contacts |
| Renewals | Manual M-Pesa payment; early renewal extends existing expiry |
| Caregiver Premium | KES 500 for 365 days; replaces the KES 100 featured boost |
| Ranking | Apply employer category/filters first; prioritize active Premium matches and rotate their order fairly |
| Identity | Separate admin identity check; membership payment and ratings do not confer verification |
| Reviews | Public employer ratings/reviews with automatically calculated average and count |

Use `max(now_utc, existing_expiry) + purchased_duration` after confirmed successful
payment. Never extend twice for a duplicate callback. On Premium expiry, retain
the free caregiver profile and identity status while removing paid priority.
Migration `e48c16d972ab` adds the required entitlement and payment fields. Legacy
boost fields are retained only for historical compatibility.


## Caregiver completion audit — 24 October 2026

- Workspace now shows missing profile details and provides pause/resume availability. Paused caregivers disappear from discovery; saved profiles and previously unlocked contacts remain available. New contact unlocks are blocked while paused.
- Added child age groups, languages, travel scope (Kenya, international, or both), travel arrangements and notice. Optional fields do not prevent basic profile creation.
- Travel nanny searches include both primary travel nannies and other caregivers offering travel childcare. Primary travel profiles automatically include the travel service. Existing profiles remain available after migration.
- Separate services describe childcare while parents work or cook. Cooking/housekeeping duties must be agreed separately; meal preparation remains a separate skill.
- Landing page has direct links for travel care, care during work, and care during cooking. Search filters support travel scope, child age group and language.
- Profile photo selection previews the image before saving. Editing preserves private national ID storage.
- Identity route: `#/identity`, accessible from the caregiver workspace. Requires a clear private selfie and explicit comparison permission. No Good Conduct document or payment required.
- Admin workspace lists pending requests. Admin-only links open private national ID and selfie with 60-second signed links and no-store responses. Admin compares these with the public profile photo, confirms legibility/matching, and approves or records a correction reason.
- Approved identity checks survive profile name/photo changes. Display-name edits also preserve pending checks; a pending photo change invalidates the submission so administrators never approve outdated photo evidence. Rejected caregivers can correct their profile and resubmit.
- Migration `f617a389d402` was tested on fresh and copied SQLite databases, then applied locally after a private backup; table row counts were preserved.
- Automated checks cover validation, privacy, role restrictions, travel discovery, availability and identity decisions. Browser checks cover registration, profile creation/editing, pause/resume, selfie submission, admin approval, public profile mobile layout and travel search.
- Storage was simulated in browser tests. Real Cloudinary upload/private download and actual human identity comparison remain manual checks. M-Pesa activation and live testing remain last, as requested.

### Manual caregiver acceptance check

1. Register as Caregiver / nanny and create a travel nanny profile with a clear photo and private ID. Choose part-time care when offering help while parents work or cook.
2. Fill travel scope, arrangements, available days, age groups, languages, experience and expected pay. Save, edit, reload and verify the values persist.
3. Open Public preview: confirm travel details appear and national ID, selfie, phone and email are absent.
4. Pause availability. In another browser/tab, confirm the caregiver is absent from matching search; existing unlocked contacts still work. Resume and confirm reappearance.
5. Open Manage your identity check, upload a selfie and give comparison permission. Confirm pending status survives reload.
6. As an administrator, open the pending request, inspect the temporary private document links and public photo, then approve or give a specific correction reason. Never approve without comparing the evidence.
7. Confirm approval shows Identity checked. Change the caregiver name or photo and confirm approval remains. Separately, change the photo during pending review and confirm a fresh submission is required.
8. Search as an employer using Travel nanny, local/international scope, age group and language. Check the results match. Check public reviews and caregiver replies using an eligible test employer with a prior unlocked contact.

### Audit verification results

- Backend: 57 integration checks passed, followed by three additional checks for paused contact access/legacy travel discovery, pending-check invalidation/resubmission, and private-storage signing options. Existing backend tests also cover reviews, ratings, replies, ownership and payment entitlement rules using isolated test data.
- Frontend: all 19 API, consent and search unit checks passed; production build and ESLint passed.
- Browser: eight caregiver journey checks passed with no JavaScript errors, plus a separate check of the three new landing links and mobile layout. Test accounts used an isolated SQLite database; profile/ID/selfie uploads and private signed delivery were simulated. No real M-Pesa charge was initiated.
- Migration: fresh database and existing-database-copy upgrades matched model metadata. Local data was backed up before upgrade; all table row counts were preserved.


## Simplified care options — 24 October 2026

This supersedes the separate service options described in the completion audit above:

- Childcare while parents work/cook is covered by **Part-time**; the two separate options and skill choices were removed.
- Overnight sleep training is covered by **Overnight / night care**. Existing primary sleep-training categories move to **Newborn & maternity / night nanny**, with the overnight service selected.
- Evening and event services are covered by **On-call / occasional babysitting**.
- Travel nannies remain available as a category and travel service.

Profile forms, public profiles, discovery and landing links use the consolidated options. Migration `a729d184b503` maps and deduplicates existing selections without deleting profiles. Saved search filters also map retired options to their replacements. A copied database and seeded legacy profile were tested before upgrading the local database with a backup.


### Further service simplification — 24 October 2026

Part-time and Short notice are no longer offered as separate options in forms, discovery, or landing pages. Existing selections and saved searches map to On-call / occasional babysitting, with duplicates removed and other services retained. This supersedes the earlier Part-time consolidation. Working hours and duties are agreed directly with the family. Migration `b830e295c614` preserves profiles and their other details.
