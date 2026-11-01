# Mlezi: Flask to Convex migration

**29 October 2026:** Flask has been removed from the active source tree, including its frontend auth/HTTP fallback and selector flags. Use [current setup](../frontend/README.md) and [retirement details](flask-retirement.md). The staged migration instructions below are historical.


**24 October 2026 update:** All application functions use Convex. The owner approved the personal-data transfer, all existing records/images were imported and verified, and local Convex-only configuration is active. Flask is no longer required. See [current cutover status, implementation and validation](convex-cutover.md). Earlier staged-migration notes below describe the preceding Flask bridge.


## Deployment supplied by the owner

- Cloud: `https://tidy-perch-115.eu-west-1.convex.cloud`
- HTTP actions: `https://tidy-perch-115.eu-west-1.convex.site`

These addresses are public configuration, not deployment credentials. The owner
must authenticate the local CLI and confirm the intended development deployment
before any push. Never put a deployment key in a `VITE_` variable.

## Current implementation status

The Convex SDK/CLI and authentication implementation are installed in `frontend`. `convex.json` points at
`frontend/convex`. Public URLs are configured in ignored `.env.local`, with an
`.env.example` for setup. The schema imports successfully; frontend build and
lint pass. Authentication is implemented and deployed; the remaining feature migration is not complete. See `convex-auth-implementation.md` for activation requirements.

Local authentication now selects Convex after Resend accepted the owner-address test email. Running servers need a restart to load the new environment settings. The Convex Auth provider and verified-session bridge are enabled in local configuration. Three existing accounts’ email/role mappings were imported; no passwords or documents were moved. Existing Flask data and Cloudinary assets remain intact.

The prepared schema covers accounts, caregivers, private caregiver documents,
employers, permanent contact unlocks, shortlists, reviews, identity submissions,
reports and historical payments. Legacy IDs support a later explicit mapping to
Convex IDs. No password hashes or credentials are in this schema.

Private identity evidence is stored separately from public caregiver fields.
The schema can reference either existing authenticated Cloudinary assets or
Convex storage IDs. A storage ID is not a public download URL. Future admin
functions must authorize every private document request before serving bytes;
Convex storage URLs do not provide the current automatic 60-second expiration.

The auth functions, verified-account reads, role-safe onboarding, internal legacy mapping import and session/permission checks are implemented. Remaining caregiver/employer feature reads and writes still use Flask. Schema indexes alone do not enforce uniqueness; account mutations enforce it transactionally.

## Local connection

Run in `frontend`:

```sh
npm run convex:login
npx convex dev --configure existing --once
npm run convex:check
```

During project selection, select the owner's Mlezi project and verify that the
resulting URL matches the Cloud URL above. Do not choose a different project,
create another project, or use a production deploy command as a substitute.
The CLI writes deployment selection into `.env.local` and generates types.
`convex:check` calls the deployed health function without reading user data.
Before the first push succeeds, that check is expected to report that the Mlezi
health function is unavailable.

The CLI can also authenticate through its browser/device flow; do not paste a
password, access token or deployment key into the chat. Login credentials are
stored by the CLI outside the repository.

## Migration order

1. Authenticate, confirm the intended development deployment, push the foundation
   and run the read-only connection check.
2. Implement email/password sign-in, role checks, ownership checks and account
   mapping. Preserve the current signup roles: public users cannot choose admin.
   Existing Werkzeug password hashes cannot simply be copied into a different
   authentication provider. Establish and test a compatible migration or reset
   flow before moving existing accounts.
3. Port caregiver profile CRUD, upload validation, public projections, travel
   care, availability, required Other descriptions and identity review.
4. Port employer profiles, filters, shortlists, permanent contact unlocks,
   reviews/replies/reports, moderation and automatic rating aggregates.
5. Test data migration against an isolated development deployment. Map all old
   IDs and references, verify counts/relationships and private evidence access,
   then validate the same browser journeys against Convex.
6. Switch the frontend only after parity checks pass. Keep a Flask/database
   backup until the new backend is verified.
7. Implement and test live M-Pesa last. Historical payment data can be preserved,
   but this foundation exposes no payment initiation or callback endpoints.

## Rules to preserve

- Employer access: KES 300 / 30 days or KES 500 / 90 days.
- Caregiver Premium: KES 500 / 365 days; separate from identity and ratings.
- Manual early renewal extends `max(now, existing expiry)`.
- Previously unlocked contacts survive expiry; new unlocks need current access.
- Paused caregivers disappear from discovery and cannot receive new unlocks.
- Filter first, then Premium priority and fair rotation.
- One editable review per eligible employer/caregiver pair; public visibility,
  caregiver replies and admin moderation determine aggregate ratings.
- Approved identity checks are one-time account checks; profile name/photo edits do not revoke approval. Pending photo changes require fresh evidence.
- Current service options exclude Part-time, Short notice, separate work/cooking,
  sleep-training, evening and event choices. Travel care remains.
- Choosing Other as a category or service requires a nonblank description.

Reference: [Convex CLI](https://docs.convex.dev/cli),
[React client](https://docs.convex.dev/quickstart/react),
[storage security](https://docs.convex.dev/file-storage/overview).


Authentication implementation, Resend setup, tests and the temporary Flask bridge are documented in [convex-auth-implementation.md](convex-auth-implementation.md).
