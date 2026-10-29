# Production security implementation — 26 October 2026

## Delivered and enabled on the existing Convex development deployment

The owner requested caregiver-only mandatory profile photos, all three identity images, and the production hardening roadmap. Employers/admins do not require photos. Public production publication is still blocked because the domain, legal operator name and public support email have not been chosen.

### Caregiver onboarding and adult identity checks

Authentication establishes a limited session so a caregiver can upload safely. `accounts.current` returns `profile_required` while no stored profile photo exists. The frontend shows only setup, legal notices, privacy requests and sign-out; protected application functions enforce the same requirement server-side. Missing-photo repairs update an existing profile rather than attempting duplicate creation. Public browsing cannot prove age or identity; signing out does not make an unapproved profile publishable.

New caregiver profiles require a profile photo, private national ID, private recent selfie and consent. Creation atomically submits an identity review as pending. Existing caregivers with an ID/photo can submit a new selfie from Identity check. An admin must confirm the ID is legible, compare all three images, enter the complete ID date of birth and affirm age 18+. The server calculates the exact birthday using Kenya's calendar date and rejects under-18, invalid or implausible dates. The full DOB is not stored in the profile/review database record; the outcome, reviewer and time are recorded. Names/photos changing invalidate the approval and adult attestation.

Pending/unapproved caregivers are excluded from employer search, saved-profile listings and contact unlocking. Their draft profile is available only to its owner and an MFA-verified admin. Existing contacts can be temporarily restricted by identity/safety checks; ordinary subscription expiry still retains previously unlocked contact access. Existing legacy caregivers need this explicit adult review before publication; previously uploaded images alone do not confer adult status.

This is a documented **manual identity/age comparison**, not an ID-issuer check, liveness test, criminal/background check, or guarantee against forged/borrowed documents. For higher assurance consider an authorized issuer-backed Kenyan ID/DOB check with live-selfie/liveness verification, appropriate consent and vendor privacy review. Do not infer age from appearance. Ambiguous ID dates or mismatched images must be rejected/requested again rather than approximated.

### Upload and abuse controls

New uploads are authenticated, streamed with a 5 MB cap, checked for JPEG/PNG/WebP signatures and fully decoded using Sharp in a Convex Node action. Images over 20 megapixels or 8000 pixels in either dimension, animated inputs, mismatched types and malformed/truncated images are rejected. Output is a freshly encoded JPEG, auto-oriented, limited to 3200 pixels per side, without EXIF/GPS metadata. User files are not sent to an additional image-processing vendor.

Upload limits: 20 attempts/account/hour, 60/account/day, 1000 globally/day. Attempts are reserved in a separate transaction before image decoding so rejected uploads still consume the quota. Unclaimed files expire after an hour. File claims enforce owner, purpose, age and single use; private IDs/selfies cannot be published as photos.

Other budgets: 30 successful application writes/account/minute; five safety reports/hour; five privacy requests/day; three account exports/day. Global emails are capped at 20/minute and 200/day in addition to existing per-email 60-second cooldown/five per hour and Auth failed-attempt limits. New Auth-user creation is limited to 20/minute and 100/day. Adjust/review budgets against the chosen production provider plan; these controls are not a CAPTCHA or complete denial-of-service defense. Search scans are bounded to 501 candidate records and ask for a category when over 500; large category catalogs need additional indexed/cursor search before growth beyond this bound.

Legacy images transferred before this change were not re-encoded automatically. Their storage stays private except public photo URLs previously issued; old Cloudinary rollback copies still need the operator's agreed retention/disposal plan.

### Administrator protection and moderation

Admins enroll a TOTP authenticator by copying the setup key into an authenticator app. Successful confirmation grants private/admin access for 15 minutes, scoped to the exact live Auth session. Failed codes persist an attempt counter; five wrong attempts lock verification for ten minutes. Reused time steps are rejected. Setup keys are AES-GCM encrypted with a server-only `AUTH_ADMIN_ENCRYPTION_KEY`, configured without printing it and retained if it already existed. No MFA key is stored in frontend configuration. Private document retrieval, identity review, MFA and moderation actions create audit events without logging document contents, passwords, OTPs, JWTs or full DOBs.

`npm run convex:admin:setup` configures the current deployment's encryption key. Back it up separately in a restricted secrets manager; changing/losing it prevents decrypting existing authenticator enrollment. There are no public MFA-reset or bypass endpoints. A deployment operator must verify the administrator's ownership out of band before using internal `adminSecurity:resetEnrollment`; it removes enrollment, grants and existing sessions and records an audit event. Dashboard/operator accounts also need their provider's MFA enabled manually.

Administrators can suspend/restore non-admin accounts, revoke suspended users' sessions, review profile/review/account safety reports, and handle privacy requests. Restoring a caregiver does not automatically republish availability. A private-document read checks authorization and MFA before returning image bytes, then logs the successful access. Admin enrollment and real operator recovery have not been performed on behalf of the owner.

### Privacy, deletion and retention

Privacy/Cookie/Terms routes and footer/banner links are present, including data providers and optional Google Fonts disclosures. They deliberately state that legal/operator/contact details remain incomplete. They require legal review and final operator/contact/provider/backup details before public launch; implementation does not certify legal compliance.

Users can download a portable account summary and request a complete data copy/correction through the private administrator queue. The summary deliberately excludes credentials, file identifiers and other people's private contacts; administrators must fulfill evidence/full-copy requests through an appropriately authenticated private channel. The code does not email exports.

An authenticated deletion request confirms the account email, immediately restricts normal use and unlists the caregiver, and schedules purge after seven days. The owner can cancel during that interval. Purge removes profile/evidence/uploads and Auth credentials/sessions; it removes saved/contact relationships, anonymizes authored reviews and retains only pseudonymous financial/audit references. Financial receipt/reference fields may require further lawful-retention policy decisions before accepting payments. Admin self-deletion is blocked until an operator transfers responsibility. The original Cloudinary/SQLite rollback copies and external backups are outside this Convex purge and must be covered by the final retention procedure.

A daily UTC 01:00 retention job removes stale rate-limit metadata, seven-day email-limit records, 90-day security audit events and expired admin grants. Pending identity requests expire after 30 days and their selfies are deleted. Reviewed selfies/obsolete identity evidence are removed 30 days after a decision while the current profile photo and active ID remain. Pending/active ID retention and financial/backup exceptions must be reviewed against the final privacy policy and applicable Kenyan requirements.

### Production setup and operations

Root and nested environment files are ignored by Git; example templates remain allowed. Root `.env` was untracked in the review and its contents were not printed. No claim of a complete repository-history credential audit is made; rotate any credential actually exposed outside intended secret storage.

Netlify/Cloudflare-compatible `_headers` and Vercel headers configure CSP, framing restrictions, MIME protection, referrer policy, permissions policy and HSTS. These must be checked on the actual HTTPS hosting response; Vite preview does not apply production-host headers. Consent still controls whether optional fonts/search preferences load.

`npm run build:production` calls `production:check` before building. The prepared Vercel/Netlify configuration uses this gate. It rejects missing domain/contact/legal values, a selected dev deployment, missing operational attestations, mismatched server SITE_URL, a test email sender and missing admin encryption setup. Passing flags are operator attestations, not independent proof of legal approval or operational readiness. Do not mark them true until completed.

`npm run convex:backup -- <new-private-directory>` prepares a restricted database-and-file export. Verify its intended deployment before running; it defaults to the current selected deployment. Configure recurring backups/retention and encrypted storage separately, including the MFA encryption key. Perform a restore drill to an isolated deployment (never import over the active database just to test).

A public `/health` HTTP endpoint is available for an uptime monitor and returns readiness booleans/public origin only. Configure Convex errors/usage alerts, email delivery monitoring, hosting monitoring and incident ownership on the actual service accounts. No external monitoring account, domain, production deployment or public website was created/published without the missing configuration.

## Verification

- 38 Convex regression/security tests pass and cover photo gates, atomic three-image submission, exact 18th birthday/underage rejection, publication/contact restrictions, malformed image rejection/metadata removal, upload/email budgets, real TOTP calculation/replay/lockout/expiry, private access checks, deletion/cancellation/purge, and retention preserving current ID/photo.
- 20 UI regression tests pass and cover profile gating/repair, legal pages during restricted sessions, authenticator setup and failed challenge, plus previous sign-in/adapter tests.
- Both `imageProcessing:checkRuntime` and `adminSecurity:checkRuntime` passed on the deployed Convex runtime using generated dummy input only; no user image, OTP, password or real enrollment was used.
- Anonymous browser checks pass for all three legal pages at 390 px, hidden pending caregivers and native sign-in: zero Flask requests, zero browser errors and no horizontal overflow. This does not substitute for live authenticated role/MFA acceptance tests.
- Production check correctly fails against the current development/localhost/test-sender configuration. Live public HTTPS Auth journeys, owner MFA enrollment, actual hosting headers, backup restore and alert delivery remain pending.

## Next operator actions

1. Sign in as the administrator and enroll an authenticator. Verify a caregiver's ID DOB and all images before approval; reject underage or uncertain cases.
2. Choose the domain, public support inbox and legal business name. Finalize notices/retention/legal review and production service configuration.
3. Complete actual HTTPS role/identity/auth tests, restore drill, monitoring and header checks, then run the guarded production build. Do not call the app publicly production-ready before these pass.
4. Integrate/test M-Pesa last, as previously agreed.
