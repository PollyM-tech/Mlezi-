# Current project status

Updated 17 November 2026. This is the current release summary; dated reports remain historical evidence. Use the [production acceptance checklist](production-acceptance-checklist.md) to record release decisions.

## Implemented in the repository

- React/Vite frontend and Convex authentication, application functions and storage. Flask is retired.
- Password, Google, email-code/magic-link and password-recovery journeys; verified-email and role/ownership enforcement.
- Caregiver onboarding with photo, private national ID, selfie and separate consent. Manual administrator identity/adult review; profile identity changes invalidate approval.
- Employer-only discovery, filtering, shortlists, contact unlocking, jobs/applications, reviews and replies. Eligible pending caregivers can appear with a pending label; contact unlocking requires approved adult identity. Profiles are not anonymous public listings.
- Employer passes: KES 300/30 days and KES 500/90 days. Caregiver Premium: KES 500/365 days. User-initiated renewals extend from the later of current expiry and payment confirmation. Ordinary expiry prevents new contact unlocks while preserving existing unlocks, subject to identity/safety/deletion restrictions.
- Direct Daraja M-Pesa STK checkout, stored payment status, backend reconciliation and idempotent entitlement activation. Sandbox confirmation grants no membership. New manual receipt submissions are disabled on both client and server; historical manual records/admin review remain. Paystack checkout is not implemented.
- Administrator MFA, private-document access controls, moderation/suspension, application audit records, private support and guest support with configurable spam protection/email delivery.
- Account summary export, private full-copy/correction requests, deletion with a two-hour cancellation window, image validation/re-encoding, upload/write budgets and scheduled retention. Convex ID evidence and reviewed selfies have 30-day retention rules; current profile photos remain. Legacy-provider evidence and external backups need separate disposal.
- Public legal/safety/help/regional pages, consent preferences, prerendering, SEO generation and hosting security-header configuration.

## Production acceptance — owner-confirmed complete

On 17 November 2026 the owner confirmed completion of the entire [production acceptance checklist](production-acceptance-checklist.md). This supersedes earlier descriptions of launch acceptance as outstanding. No outstanding checklist items were reported.

The confirmation covers deployment/origins, operator particulars and notice review, authentication/admin access, mobile onboarding/identity, marketplace/jobs, payments, support/privacy, recovery/monitoring/security, public pages and final release checks. Detailed release identifiers, per-item test results, qualified-review records and evidence locations were not supplied in this conversation. Codex has not independently verified those production activities.

Checklist items that permit remediation or an accountable risk decision do not establish that every optional security improvement was implemented. Retain the actual decisions and evidence in the operator’s records.

The intended public origin is https://mlezicare.com. Local `CONVEX_DEPLOYMENT=dev:…` selects CLI development operations and does not identify the backend used by the deployed frontend. The earlier local configuration findings below remain historical evidence, not a statement that the owner’s production deployment is incomplete.

## Later milestones

Reviewed Kiswahili content, authentic vector logo, dedicated staffed WhatsApp support, optional Good Conduct/reference review and optional card/bank checkout. OCR/face matching is not required for the existing manual review scope and must have its own evaluation/privacy review before adoption. Testimonials have been owner-supplied; retain publication permission privately rather than treating quotes as still wholly absent.

## Earlier local verification on 17 November 2026

- 145 Convex tests passed; 163 authentication/UI tests passed (308 total).
- Before the owner’s completion confirmation, local `npm run production:check` failed on missing proprietor/address/review, a local development deployment selection and missing attestations: `LEGAL_REVIEW_COMPLETE`, `BACKUP_RESTORE_TESTED`, `ALERTS_CONFIGURED`, `LIVE_AUTH_TESTED`, `LEGACY_ASSET_RETENTION_CONFIRMED`, `SUPPORT_FLOW_TESTED`.
- The check stops before remote health verification when local prerequisites fail. Missing attestations do not establish that corresponding live work has never happened.
- Vercel runs `npm run build`; production acceptance is a separate gate. No deployment, configuration change, message, payment or private-record inspection was performed during this update.

The completion confirmation was recorded through documentation changes only; no local/deployed environment flags, legal content, provider settings or release configuration were changed to match it.
