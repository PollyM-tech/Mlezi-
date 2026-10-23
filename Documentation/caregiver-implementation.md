# Caregiver account and profile milestone

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
- Verification uses existing unverified/pending/verified/rejected states; the
  ID-only tier and admin approval workflow remain to be reconciled and built.

## Validation and remaining work

Run backend integration tests with `python -m unittest discover -s tests -v`
inside the backend virtual environment. Frontend checks are documented in its
README. All test accounts and uploads are isolated/mocked; the existing local
account is preserved. Real Cloudinary delivery and browser interaction still
need a manual end-to-end check with development documents.

This completes the account/profile journey, not the entire caregiver product.
Certificate submissions, admin verification, featured boosts/payments, reviews,
password recovery, and account/data deletion remain separate work. Search and
employer contact access are subsequent marketplace milestones. Production work
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
