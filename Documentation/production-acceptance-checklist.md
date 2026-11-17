# Production acceptance checklist

Prepared 17 November 2026. **Status: owner-confirmed complete on 17 November 2026.** The owner stated, “have completed the checklist.” Checked items below record that overall confirmation, including conditional items where applicable; they are not independent checks performed by Codex. See [current status](current-status.md).

Detailed release identifiers, individual results and evidence locations were not supplied in this conversation. Blank fields below remain available for the owner’s records; no values or individual outcomes have been inferred. Completion does not assert that optional security improvements were implemented where the checklist permits an accountable risk decision.

Release commit: __________  Frontend URL: __________  Acceptance date: __________
Convex deployment/type: __________  Release owner: __________
Evidence location (restricted where needed): __________

Record tester, date, result and evidence for each section. Use synthetic/test accounts and private evidence storage; never put credentials, ID images, OTPs or full provider payloads in this document. Use isolated fixtures for destructive/expiry tests. A live payment requires deliberate operator authorization.

## 1. Release and deployment

- [x] Record release commit and hosting build; confirm frontend, Convex functions/schema and scheduled jobs match the intended release.
- [x] Verify the backend is the intended Convex production deployment using the dashboard, Vercel Production variables and actual browser network/WebSocket hosts. Local CLI selection alone is insufficient.
- [x] Confirm `VITE_APP_ORIGIN`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, backend `SITE_URL` and exact allowed frontend origins match verified HTTPS hosts. Confirm custom auth domain/callback and CSP work together.
- [x] Confirm production secrets are server-only, provider/operator accounts have MFA, and sandbox keys/test data cannot affect live entitlements.
- [x] If a cutover is required, prepare and validate account/file/payment/MFA preservation and rollback before switching; do not point users at an empty backend.

## 2. Operator details and notices

- [x] Supply actual `VITE_LEGAL_PROPRIETOR` and `VITE_LEGAL_SERVICE_ADDRESS`; confirm hardcoded service/operator/structure labels accurately describe the operator.
- [x] Obtain qualified review of notices, consent, identity processing, retention, provider/transfer arrangements, registration/DPIA assessment and incident obligations. Record the review outcome and any required follow-up.
- [x] Verify deployed Terms/Privacy/Cookies/identity explanations match actual functionality, STK-only checkout and contact-access policy.
- [x] Set `VITE_LEGAL_REVIEWED=true` and `LEGAL_REVIEW_COMPLETE=true` only after the reviewed release and particulars are complete.

## 3. Authentication and administrator access

- [x] Test password signup/login, Google signup/login, email verification, OTP, magic link and recovery with external recipients. Verify expired/reused/invalid proofs fail and account linking cannot bypass email ownership.
- [x] Test logout, password reset/session revocation, refresh/new tabs and role denial on the deployed HTTPS app.
- [x] Test administrator enrollment/challenge, expired MFA grant, denied non-admin/private-file requests and an audited document read/review. Confirm operator recovery procedure and encrypted MFA-key backup.
- [x] Record live results before setting `LIVE_AUTH_TESTED=true`.

## 4. Caregiver onboarding and identity

- [x] On a mid-range Android, complete signup, camera photo/ID/selfie uploads, consent and submission over throttled 3G and a real mobile network.
- [x] Test large/rotated/invalid images, upload interruption/retry, expired session and duplicate submission; verify errors permit recovery and admin images remain readable.
- [x] Test approve/reject/resubmit and exact age boundary with synthetic fixtures; pending listings have accurate labels and cannot unlock contacts.
- [x] Verify name/photo changes invalidate approval; rejected/suspended/deletion-pending profiles are excluded as required.
- [x] Verify IDs/selfies cannot be retrieved anonymously or by another account; private responses and logs disclose no evidence URLs/content unnecessarily.

## 5. Employer marketplace and jobs

- [x] Test employer filters, pagination, details, shortlist, reviews/replies and job post/application/acceptance flows across employer/caregiver roles.
- [x] Verify unpaid accounts and another employer cannot reuse an unlock; stored phone/email remain absent from search/profile/applicant projections without authorization.
- [x] Verify active pass permits new unlocks, ordinary expiry blocks new unlocks and preserves prior unlocks, and identity/safety/deletion restrictions still apply.
- [x] Test contact-sharing moderation and report/suspend/restore handling; record directory scraping/read-budget limitations and remediation or accountable risk acceptance.

## 6. M-Pesa and memberships

Owner reports STK working. Record acceptance against this release; do not restart provider setup without evidence it is needed. See [STK operations](mpesa-stk-push.md).

- [x] Verify live Daraja approval/configuration, correct Paybill and callback reachability for the actual deployment. Confirm temporary KES 5 test pricing is disabled after any authorized test.
- [x] With authorization, verify a successful live STK payment against the business statement and correct one-time entitlement activation; browser updates without another request.
- [x] Verify cancellation, failure, timeout/delayed response and duplicate clicks do not grant access or start duplicate charges. Document unresolved-payment investigation and customer support/refund handling.
- [x] Verify duplicate/forged callbacks cannot grant or extend access and server reconciliation validates the stored provider request. Record callback ingress-filtering decision and coverage of default-domain routes.
- [x] Verify both employer durations, caregiver Premium, early renewal and expired renewal with isolated fixtures; sandbox confirmations grant no live entitlement and payment never grants identity approval.
- [x] Confirm new manual receipt submissions are disabled in UI and direct backend calls; historical reports remain resolvable without duplicate STK approval.

## 7. Support and privacy operations

- [x] Verify guest Turnstile/allowed hostnames, acknowledgement and admin reply delivery to an external recipient, private inbox routing and account ticket isolation.
- [x] Confirm staffing can meet the published response commitment; record results before setting `SUPPORT_FLOW_TESTED=true`.
- [x] Test account summary and secure supplemental full-copy/correction workflow, including identity evidence and any records omitted from the summary; record deadlines and responsible reviewer.
- [x] In an isolated deployment, test deletion restriction, cancellation window, scheduled purge and storage/Auth cleanup. Verify retention dry run/fixtures and deployed cron execution without exposing real evidence.
- [x] Confirm legacy Cloudinary/other copies and backups have an approved expiry/deletion procedure; document financial/audit exceptions before setting `LEGACY_ASSET_RETENTION_CONFIRMED=true`.

## 8. Recovery, monitoring and security

- [x] Back up database AND files, restrict/encrypt copies, preserve recovery configuration separately and verify backup retention/deletion handling.
- [x] Restore into an isolated deployment with external email/payment actions disabled; verify accounts, file privacy, memberships and receipt uniqueness. Document reconciliation of post-backup payments/deletions before setting `BACKUP_RESTORE_TESTED=true`.
- [x] Trigger and receive uptime/error/email-failure/usage alerts; name the incident owner and escalation route before setting `ALERTS_CONFIGURED=true`.
- [x] Verify actual HTTPS response security headers, private no-store delivery, dependency advisories and secret hygiene. Record audit-log limitations (operator mutability/90-day retention), independent-log work and remediation or accountable risk acceptance.

## 9. Public pages and usability

- [x] Check public navigation, legal/safety/help pages, mobile layouts, keyboard use, labels/focus/error feedback and common desktop/mobile browsers.
- [x] For an approved indexable release, set `VITE_APP_ORIGIN=https://mlezicare.com` and `VITE_SITE_INDEXABLE=true`, rebuild and verify live robots/sitemap/canonicals and Search Console. Preview builds stay noindex; private accounts/profile data stay out of public HTML/sitemaps.
- [x] Confirm prices/payment copy, pending identity labels, testimonials and publication permissions match actual service capabilities.

## 10. Final release decision

From `frontend`, run and record outputs:

```bash
npm run security:check
node --test tests/routes.test.mjs
npm run test:responsive
npm run production:check
npm run security:headers -- https://mlezicare.com --require-https
npm run seo:check:live -- https://mlezicare.com
```

Verify target/arguments against each script before running against another host. Automated suites and configuration flags supplement live evidence; they do not replace it. Vercel's ordinary build does not enforce the production check.

- [x] Record all check results, resolve failed acceptance items and assign owners/dates to accepted limitations. Do not silently mark untested items passed.
- [x] Confirm deployment/recovery instructions and support/incident contacts are available to the operator.
- [x] Release owner records the final decision and any conditions here.

Acceptance status: checklist completion confirmed by the owner in conversation, 17 November 2026.
Detailed release decision/conditions: not supplied in this conversation.
Open items: none reported by the owner; individual risk decisions and evidence remain in the owner’s records.
