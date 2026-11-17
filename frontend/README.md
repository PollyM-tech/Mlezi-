# Mlezi — React and Convex

Mlezi uses JavaScript/React for the frontend and JavaScript functions on Convex for authentication, application data and uploads. Vite builds the frontend. There is no Flask server, Python application dependency, port-5000 proxy, or alternative authentication backend.

Current release summary: [project status](../Documentation/current-status.md). The owner confirmed the [production acceptance checklist](../Documentation/production-acceptance-checklist.md) complete on 17 November 2026; checked items record owner confirmation. Dated implementation reports retain historical results.

## Run locally

For Google signup configuration, see the [Google signup guide](../Documentation/google-signup.md).

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Use the URL Vite prints, normally http://localhost:5173. The app connects directly to the existing cloud backend. Configure these public values in `.env.local`:

```dotenv
VITE_CONVEX_URL=https://tidy-perch-115.eu-west-1.convex.cloud
VITE_CONVEX_SITE_URL=https://tidy-perch-115.eu-west-1.convex.site
```

No `VITE_AUTH_BACKEND`, `VITE_DATA_BACKEND` or `VITE_API_URL` selector is needed or used. Convex is always enabled. Never put API secrets in `VITE_` values. Authentication/email/payment secrets belong in the Convex deployment environment.

After changing backend functions in `convex/`, authenticate/select the intended development project and run:

```bash
npm run convex:login
npm run convex:dev
npm run convex:check
```

`convex:dev` currently deploys once to the selected development deployment. `SITE_URL` on Convex must match the frontend origin for redirects and private-file CORS. Do not deploy to production just to run locally.

## Checks

```bash
npm run lint
npm run test:convex
npm run test:auth-ui
node --test tests/consent.test.mjs tests/search.test.mjs
npm run build
```

Tests for the retired Flask HTTP/refresh bridge have been replaced by native Convex session/API regression tests. There is no Python test command for the active app.

## Authentication and caregiver identity

Convex Auth provides password signup/sign-in, email verification, OTP, magic links, reset and session revocation. Resend sends account emails. Verify the actual deployment uses a verified production sender and delivers to recipients outside the provider owner account. Existing imported accounts link only after verified email ownership. Historical password hashes were not migrated.

The provider stores session credentials in the browser tab's sessionStorage. The application uses a single authenticated Convex client and never reads old Flask refresh tokens or calls `/api/auth/refresh`. Private file HTTP requests carry Convex authorization. Errors from an older account cannot sign out a newer account.

Caregivers without a stored photo are restricted to profile setup, legal/privacy requests and sign-out. New profiles require a photo, private national ID, private selfie and consent. They enter administrator review. Eligible pending profiles can appear to signed-in employers with an explicit pending label; contact unlocking requires a manual identity check and server-enforced 18+ DOB decision. Image uploads alone do not prove age/authenticity. Changing name/photo invalidates approval. Employer/admin accounts do not require photos. Admins enroll TOTP before privileged access.

New images are fully decoded and re-encoded without metadata; quotas, private-document access logs, suspension, data requests/deletion and retention jobs are implemented. See [security implementation](../Documentation/production-security-implementation.md) for limits and operational procedures.

## Employer workspace, memberships and payments

Employers can search approved adult caregivers, shortlist, unlock contacts with an active pass, manage their account, and write public reviews. Rating aggregates update automatically. Identity approval, Premium and reputation are separate.

Plans remain KES 300/30 days and KES 500/90 days for employer access, and KES 500/365 days for caregiver Premium. Renewals are manual and extend an unexpired plan. Expiry preserves previously unlocked contacts, subject to identity/safety restrictions and deletion.

Customer checkout uses direct Daraja M-Pesa STK Push with server-side status reconciliation and one-time membership activation. The owner reports STK working; verify each release against the live payment acceptance checklist. Sandbox confirmations never grant live membership. New manual receipt submissions are disabled in the UI and backend; historical records remain available to administrators. Paystack card/bank checkout is not implemented. See [M-Pesa operations](../Documentation/mpesa-stk-push.md).

## Cookies and public pages

The public landing page is `/`; regional guides are at `/east-africa/`, `/kenya/`, `/uganda/`, `/burundi/` and `/rwanda/`. Privacy/Cookie/Terms pages use `/privacy/`, `/cookies/` and `/terms/`. The private application is `/app/#/workspace`. Old hash links redirect while preserving email sign-in codes. The logo is `src/assets/logo.png`.

`npm run build` pre-renders public HTML and generates robots/sitemap files. Indexing is off until the real HTTPS `VITE_APP_ORIGIN` is set and `VITE_SITE_INDEXABLE=true` is explicitly enabled for production; supported host previews force it off. Read the [SEO and regional discovery guide](../Documentation/seo-and-regional-discovery.md) before launch. `npm run test:seo` verifies crawl controls and local keyword matching.

Cookie consent remembers accept/decline for 180 days. Optional search preferences and Google Fonts load only after acceptance. Declining leaves essential authentication available. No advertising/analytics tracker is installed.

## Production and retired files

The service is Mlezi and version 1 is marketplace-only, at mlezicare.com. Current legal configuration names Lintech Telecom as operator and describes a registered sole proprietorship; verify these particulars during qualified review. The owner confirmed all production acceptance sections complete on 17 November 2026, including operator particulars, qualified notice review, hosting, email and support. Detailed evidence was not supplied in this conversation; this documentation update does not change local or deployed configuration. `npm run build:production` checks production configuration, legal review, backup restore, alerts and real Auth tests. At the owner’s request, Vercel now uses ordinary `npm run build` for deployment; run the production checks separately before a public launch. Normal `npm run build` remains available for development checks.

The retired `backend/` directory was removed on 29 October 2026 after checking the completed Convex migration. At the owner’s request, the private local Flask recovery archive and its now-empty `.backups/` directory were permanently deleted on 1 November 2026. No local Flask recovery archive remains. Existing Convex records and cloud assets were not deleted.

Older documents describe the historical migration and may contain retired Flask commands. This README and [Flask retirement notes](../Documentation/flask-retirement.md) define the current setup.

## Cookie/security testing with a friend

Cookies and baseline access controls are already implemented. Run `npm run security:check` for the automated security regression/build checks, then `npm run test:preview` for a loopback built preview with response security headers. `npm run security:headers -- http://127.0.0.1:4173` checks those headers; use an HTTPS staging URL and `--require-https` for a hosted test. HTTP preview cannot validate TLS, HSTS or Secure-cookie behavior.

Use the [tester guide](../Documentation/security-testing-guide.md) and [finding template](../Documentation/security-test-report-template.md). Use an isolated deployment with synthetic data and separate tester accounts. A Resend test sender limits delivery to its owner; verify the selected deployment's sender before inviting testers. Do not share your owner/admin credentials, MFA seed or API secrets. No public hosting or active penetration scan is started by these commands.


## Private support tickets

Public help is at `/support/`; account tickets and the admin queue are at
`/app/#/support`. Admin replies display as Mlezi Support. Operator phone numbers
and personal email are not displayed. Once Turnstile is configured, signed-out visitors submit the form using their email address. They receive an automatic acknowledgement with a 48-hour commitment; administrator replies are also emailed.

See [support setup and access rules](../Documentation/support-tickets.md).
Production no longer requires a publicly displayed support email; it requires
working guest support and `SUPPORT_FLOW_TESTED=true` after the actual journey is
verified. Configure the verified support sender and private SUPPORT_INBOX_EMAIL on Convex. The website does not display this inbox, but email recipients can see the sender/reply address. Authentication email delivery remains required too.


## Legal notices and account acknowledgement

`/privacy/`, `/terms/` and `/cookies/` use the shared, versioned text in
`src/lib/legal-content.js`. Run `npm run legal:export` for matching Markdown review
copies. See the [review handoff](../Documentation/legal-review-handoff.md) for
confirmed business scope, unresolved operator facts and qualified review questions.

New account completion requires acceptance of the current terms and acknowledgement
of the privacy notice; the server records the version and timestamp. Optional
cookies and identity-comparison permission remain separate. Existing/imported
accounts are not backfilled with invented consent. STK payments are separate from identity approval and legal acknowledgement.

Current `src/lib/legal.js` fixes the service/operator/structure labels; configure the actual
`VITE_LEGAL_PROPRIETOR` and `VITE_LEGAL_SERVICE_ADDRESS`. Historical entity/structure
environment names do not override these labels. Naming the operator alone does not complete review. Keep `VITE_LEGAL_REVIEWED=false` and
`LEGAL_REVIEW_COMPLETE=false` until the final text and facts have qualified review.


## Vercel project directory

Set Vercel Root Directory to `frontend`. The sole Vercel configuration is
`frontend/vercel.json`: Vite, install `npm ci`, build `npm run build`, output `dist`.
Existing security headers remain in that file. A mistakenly created, malformed root
`vercel.json` was removed on 1 November 2026. Keep indexing disabled while testing;
a successful build does not complete the separate production readiness checks.

See [registration, upload and one-time identity fixes](../Documentation/registration-upload-fixes.md) for local testing, trusted frontend origins and email-provider requirements.

For the device-size and browser layout suite, run `npm run test:responsive` after installing Playwright browsers. See the [responsive audit](../Documentation/responsive-audit.md) for covered screens, viewport sizes, results and physical-device acceptance procedures. The suite uses isolated sample data and sends no real emails or uploads.

Current checkout is STK-only for Paybill **4125123**, account reference **mlezicare**. [Manual payment notes](../Documentation/manual-payments.md) describe the retained historical workflow; new receipt submissions are disabled.

Administrator setup, restricted login, authenticator enrollment and live work queues are documented in [admin-workspace.md](../Documentation/admin-workspace.md).

### Paystack test-key connectivity

`npm run paystack:check -- --convex` reads `PAYSTACK_SECRET_KEY` privately from the
CLI-selected Convex deployment and makes a read-only Kenyan/KES bank-list request
from the local machine. It accepts `sk_test_` keys only and prints no credentials.
Use `npm run paystack:check` if the test secret is instead in the local environment.
This check does not deploy code, initialize a checkout, charge money, send email or
activate membership. A successful result does not test requests originating from
Convex, individual payment channels, callback/webhook delivery or settlement.
Paystack checkout and verified membership activation are not implemented yet;
direct Daraja STK Push is the current customer payment flow.
