# Convex application cutover — 24 October 2026

**29 October 2026:** Flask has been removed from the active source tree, including its frontend auth/HTTP fallback and selector flags. Use [current setup](../frontend/README.md) and [retirement details](flask-retirement.md). The staged migration instructions below are historical.


## Current state

The remaining application functions are implemented in Convex: caregiver profiles and availability, uploads, public discovery and filtering, employer account/dashboard/contacts, shortlists, permanent contact unlocks, public reviews and replies, automatic rating aggregates, reporting/moderation, identity submission/review, membership plans, and historical payments. Convex Auth and Resend remain the authentication/email services.

Deployment: `https://tidy-perch-115.eu-west-1.convex.cloud`; file HTTP actions: `https://tidy-perch-115.eu-west-1.convex.site`. No new cloud project was created.

**Cutover completed on 24 October 2026 after the owner explicitly approved transferring all records and images to `tidy-perch-115`.** The import succeeded and the migration marker is complete. Local configuration now selects `VITE_AUTH_BACKEND=convex` and `VITE_DATA_BACKEND=convex`. The app uses Convex for authentication, application data and new uploads; Flask is no longer required.

Transferred and verified: three accounts, one caregiver profile, one employer profile, one shortlist, one profile photo and one private national ID. There were no contacts unlocked, reviews, verification submissions, reports or payments to transfer. Password hashes, API keys, auth sessions and tokens were excluded. Existing Convex Auth bindings were preserved; other imported accounts link only after verified email proof. Both storage images exist, account/profile and shortlist relationships are intact, and the source database matched the snapshot after transfer. The original SQLite records and Cloudinary assets remain intact as rollback sources. Temporary private snapshots are removed after verification.

## Completed activation procedure / future migration reference

1. Confirm there have been no Flask writes since the snapshot. If records changed, create a fresh snapshot using `backend/.venv/bin/python backend/scripts/export_convex_data.py --output-dir <new-private-directory>`; do not reuse an existing directory.
2. From `frontend`, run `npm run convex:dev` to ensure the current functions are deployed, then `npm run convex:data:import -- <private-directory>/snapshot.json`.
3. Run `npx convex run migration:status`. Confirm all table counts and the completed marker; query public profile `/caregivers/1` through the Convex facade to confirm the preserved legacy link. Check both migrated storage objects exist. The importer preserves verified Auth bindings, account roles, legacy links, private evidence and saved relationships. Its database transaction rolls back if any relationship/image is invalid. A completed migration marker makes reruns leave existing data untouched.
4. Add `VITE_DATA_BACKEND=convex` to `frontend/.env.local`, retaining `VITE_AUTH_BACKEND=convex` and the existing Convex addresses. Restart Vite. The Vite configuration removes the Flask proxy in this mode. Build with both flags for deployment. No Flask server or Python environment is needed to run the activated app.
5. Test real sign-in, each role's workspace, existing caregiver photo/profile, employer shortlist, profile edits and a new upload. Verify private document review as admin. No test sign-in email was requested automatically.
6. Delete the restricted temporary export after confirming the transfer. Keep the original backend/SQLite/Cloudinary assets as the rollback source; do not delete them during cutover. If rollback is required after new Convex writes, reconcile/export those changes first rather than silently discarding them.

## Native implementation

`frontend/src/lib/convexApi.js` adapts the existing UI calls to `marketplace.read` queries and `marketplace.write` mutations; it does not send `/api` requests in native mode. The shared Convex client supplies authentication. The legacy HTTP adapter is retained solely for pre-cutover use/rollback. Authenticated operations check a verified, live Auth session and the account's server-owned role on every invocation. Mutations enforce ownership, uniqueness, validation and aggregate updates transactionally.

The public profile response deliberately excludes phone/email, account bindings and document/storage identifiers. Employers obtain contacts through a permanent unlock record. Expired passes and paused caregiver availability block new unlocks while leaving existing contacts accessible. Search matches the requested filters before Premium priority. Premium order rotates hourly with a server-chosen time bucket, stable across pagination during a search. This implementation replaces Flask's per-search random signed rotation seed. Search/reputation aggregate queries currently collect matching records at MVP scale; larger datasets will need cursor pagination and bounded search indexes.

Uploads use authenticated `/files/upload` HTTP actions. JPEG/PNG/WebP signatures and the 5 MB limit are checked server-side, including streamed requests. The server records owner and upload purpose; mutations cannot claim another person's upload or publish an ID/selfie as a profile photo. Unclaimed uploads expire after one hour. Profile photos alone receive storage URLs in public projections. IDs and selfies are served through `/files/document` after checking a live admin session on every request; permanent storage URLs are never returned. Responses use `no-store`. The admin UI holds temporary browser object URLs, revoking them after 60 seconds, on replacement, or on unmount; already downloaded bytes cannot be revoked remotely.

Identity approval remains separate from Premium and ratings. Approved checks survive profile name/photo edits. Pending name edits do not invalidate evidence; pending photo changes require resubmission. Approval still requires explicit comparison confirmations and an unchanged photo snapshot.

## Membership and M-Pesa

Plans remain KES 300/30 days and KES 500/90 days for employers, and KES 500/365 days for caregiver Premium. The internal-only settlement mutation validates server pricing, applies a successful grant once, and extends `max(current expiry, now)` by the plan's duration. No browser mutation can mark payments completed or grant entitlement. No live Daraja initiation/reconciliation/callback is exposed yet. The UI shows payments as coming soon and disables purchase buttons; M-Pesa implementation/testing remains the last step.

## Validation

- 28 Convex tests: auth, permissions, profile ownership, upload ownership/type checks, private HTTP evidence checks, expiry/unlocks, isolated shortlists, public ratings/moderation, identity invalidation, search priority, migration rollback/idempotency, and atomic renewal settlement.
- 15 auth/adapter UI tests: session readiness/redirects, email form flows, direct Convex reads, upload-to-storage-ID writes, and server-error propagation.
- Native production build, lint, and existing Node regression tests.
- Browser preview of the native build: real Convex public search and sign-in UI load with zero Flask API requests, zero browser errors, and no horizontal overflow at 390 px.
- Post-import browser check confirms the migrated caregiver is searchable, the legacy profile link works, the photo loads from Convex, private owner details stay hidden, and the native build makes no Flask requests. Record/image/relationship checks passed.
- Live authenticated role journeys remain for human sign-in; no emails or passwords were requested automatically. Resend testing-address/domain restrictions remain as documented in the authentication setup.
