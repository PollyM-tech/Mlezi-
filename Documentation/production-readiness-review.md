# Production readiness review — 24 October 2026

**26 October update:** The hardening work requested after this review is implemented and enabled on the existing development deployment. See [implementation, evidence and remaining production blockers](production-security-implementation.md). The findings below describe the pre-hardening state and are retained for traceability. Domain/support/legal details, actual production hosting/configuration, live Auth/MFA acceptance, backup restore and alerts remain outstanding.


## Verdict and scope

The Convex migration is complete and the application is ready for controlled testing. A public production launch still has the gaps below, excluding M-Pesa. This review inspected source/configuration and public vendor documentation, checked the selected deployment's non-secret sender/origin settings, and ran a production-dependency audit. It did not request emails, exercise real users' credentials, inspect private identity images, verify the hosting dashboard, or change security/application settings.

The previously passing 28 Convex tests, 15 auth/adapter UI tests and migrated-profile browser checks provide regression evidence, not proof that all production journeys have been exercised.

## Implemented foundations

- Cookie accept/decline and later revocation; optional search storage and Google fonts disabled before consent. The preference cookie lasts 180 days, uses SameSite=Lax and Secure on HTTPS. Essential Auth persistence uses sessionStorage; declining optional cookies does not block sign-in.
- Password signup/sign-in, email verification, email OTP, magic links and password recovery using Convex Auth/Resend; 10-minute one-use email proofs, basic failed-attempt limits and per-email sending limits.
- Live session checks, verified email checks, server-owned account roles and record ownership checks. Signup cannot create an admin. Sign-out/reset session revocation is covered by regression tests.
- Public profile projection excludes private contact/evidence. Private IDs/selfies require authenticated admin HTTP requests. Premium, manual identity approval and employer ratings are separate.
- Upload ownership/purpose checks, MIME/signature checks and a streamed 5 MB cap; automatic deletion of unclaimed uploads after one hour.
- Production npm dependency audit: zero reported vulnerabilities on review date. This checks known package advisories, not application logic.

## Work before public launch

| Priority | Finding and evidence | Action / acceptance evidence |
| --- | --- | --- |
| Immediate | Root `.env` exists, is untracked, is not ignored, and contains sensitive-looking assignments. No evidence of a committed leak was found in the checks performed; values were never printed. | Add root secret-file ignore rules; inspect staged files before committing. Rotate credentials if a separate history/exposure review finds they were shared or committed. |
| Launch blocker | Selected Convex deployment is development; last deployed origin is localhost and email uses the Resend test sender. | Configure frontend HTTPS hosting/domain and the project's production Convex deployment, production secrets, exact SITE_URL/CORS origin and frontend URLs. Verify Resend sending domain and use its sender; test delivery to a recipient beyond the Resend owner. Keep development and production data/configuration separate. |
| Launch blocker | Cookies have a technical consent flow, but no published Privacy Policy, Cookie Policy or Terms pages/links were found. National IDs/selfies are collected without a complete published lifecycle policy. | Publish clear notices for data collected, public profile/contact disclosure, providers, optional Google requests, retention, deletion, contact/support and overseas processing. Review applicable Kenyan data protection/ODPC obligations; do not treat the banner alone as legal compliance. |
| Launch blocker | Account deletion/export, document-retention enforcement and cleanup of replaced/claimed evidence are not implemented. Old Cloudinary originals remain as rollback copies after migration. | Define retention by record type; add authenticated deletion/export requests and administrator workflows, including referenced storage and Auth data. Define treatment of public reviews, permanently unlocked contacts and backups on account deletion. End rollback retention deliberately rather than deleting originals without verification. |
| High | Upload validation checks initial signatures but does not fully decode/re-encode images, constrain dimensions or strip EXIF/GPS metadata. Eight PNG signature bytes pass the current unit fixture. | Decode and re-encode valid images server-side, limit dimensions/pixel count, strip metadata, reject malformed/decompression-heavy content and test these cases. Keep originals private if any retention is needed. |
| High | Per-email sending limits/basic Auth limits exist; upload frequency/total bytes and overall email-send budgets are not enforced. Reports/review writes can also be spammed. | Add server-side per-account upload quotas and mutation limits, plus global email budget/throttling and suitable bot controls. Test bypass attempts across multiple emails/accounts. |
| High | Admins can read national IDs/selfies, but app-level MFA/step-up, document-access auditing, user suspension and general account/profile reporting are missing. Existing reporting is for reviews. | Require stronger admin authentication, record private-document access and identity review actions without logging evidence/tokens, and implement report/block/suspend handling with revocation. Protect Convex/Resend/hosting operator accounts with MFA where available. |
| Launch verification | Real end-to-end password, OTP, magic-link, reset and admin review journeys have not all been completed on a public HTTPS deployment. Some checks use mocks and the final browser check was anonymous. | Test all roles on real mobile/desktop browsers, refresh/new tabs, invalid/reused/expired codes, logout/reset revocation, account linking, role denial, ID submission/approve/reject/resubmit and name/photo changes. Use test accounts and deliberate user-triggered messages. |
| Operations verification | Backup schedules, restore drills, production alerting and security headers are not established by this repository review. | Verify document AND file backups and restore them into an isolated deployment. Configure error/uptime/email-failure alerts and usage/budget monitoring. Apply CSP, framing restrictions, referrer policy and other appropriate hosting headers, then inspect actual HTTPS responses. Never log passwords, OTPs, JWTs or private image URLs/content. |

## Verification meaning and product decisions

Email verification proves control of an email address. Phone fields are currently unverified; decide whether phone verification is needed before connecting users. Caregiver identity verification is a manual ID/selfie/profile comparison, not an issuer database check, police clearance or proof of employment suitability. Employer review eligibility currently requires an unlocked contact, not confirmed employment; the UI discloses this. Keep these distinctions in public copy and administrator instructions.

Convex Auth remains a beta offering according to its official documentation. This does not by itself require switching providers; account for the dependency in upgrade policy and regression tests. Session credentials are script-readable sessionStorage, so preventing XSS through safe rendering, controlled dependencies and a tested CSP matters; the consent-preference cookie itself is not an authentication secret and need not be HttpOnly.

Public search and aggregates collect records at MVP scale. Before substantial growth, use bounded/indexed pagination and load tests. Accessibility review, keyboard operation, failed uploads/network interruptions, and support/dispute processes also need a launch acceptance pass.

## Suggested sequence

1. Secret-file handling, upload validation, quotas and admin controls.
2. Privacy/terms, retention/deletion and reporting/support workflows.
3. Domain, verified sender, production deployment and hosting configuration.
4. Full real-user acceptance tests, backup restore drill, monitoring and HTTPS-header verification.
5. M-Pesa final integration and testing, as agreed.

## Vendor and regulatory references

- Resend test-sender restriction: https://resend.com/docs/api-reference/errors
- Convex production deployment: https://docs.convex.dev/production/overview
- Per-deployment configuration: https://docs.convex.dev/production/environment-variables
- Convex Auth beta status: https://docs.convex.dev/auth/convex-auth
- Convex backup/restore: https://docs.convex.dev/database/backup-restore
- Kenya ODPC data-subject rights: https://www.odpc.go.ke/rights-of-a-data-subject/
