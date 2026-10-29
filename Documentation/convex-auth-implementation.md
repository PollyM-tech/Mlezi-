# Convex authentication and account migration

**29 October 2026:** Flask has been removed from the active source tree, including its frontend auth/HTTP fallback and selector flags. Use [current setup](../frontend/README.md) and [retirement details](flask-retirement.md). The staged migration instructions below are historical.


**24 October 2026 update:** All application functions use Convex. The owner approved the personal-data transfer, all existing records/images were imported and verified, and local Convex-only configuration is active. Flask is no longer required. See [current cutover status, implementation and validation](convex-cutover.md). Earlier staged-migration notes below describe the preceding Flask bridge.


## Implemented and deployed to development

The `tidy-perch-115` cloud development deployment now has Convex Auth with:

- Email/password signup and sign-in. Signup verifies email ownership before protected access.
- Passwordless magic links (high-entropy, single-use, ten-minute expiry).
- Passwordless eight-digit email OTPs (single-use, ten-minute expiry).
- Forgot-password flow: request a code, verify it and set a new password. Previous sessions are revoked.
- Caregiver/employer account onboarding after email verification. Public registration cannot create an admin or change an existing role.
- Cross-provider account linking by verified email, including unfinished password signup followed by OTP login. Email indexes remain canonical.
- Per-email send throttling: one request per minute, up to five per hour across methods. Failed verification attempts are also limited by Convex Auth.
- Safe callback origins and visible retry screens for invalid links, codes and revoked sessions. Magic-link tokens are removed from the browser URL.
- Essential session storage with its own namespace; optional-cookie rejection does not disable authentication.

Resend sends text-only transactional emails through the server. API credentials,
verification codes and link tokens are not logged by application code.

## Current activation state

Code, schema and signing keys are configured on the development deployment.
Three existing local accounts' email/role/legacy-ID mappings were imported. No
password hashes or identity documents were copied. Existing profiles, reviews,
shortlists, unlocks and payment history remain in the local Flask database.

**Local frontend and backend settings now select Convex authentication.**
Resend accepted an authentication-email request to the owner's test address
`pmoraa431@gmail.com`. Inbox delivery and the human code-entry journey still need
confirmation. The Resend test sender (`onboarding@resend.dev`) supports the
owner's Resend-account email only; a verified sending domain is required before
opening email login to other users. Restart running Flask/Vite processes to load
the new local environment settings. Profile/marketplace APIs still use Flask
through the verified-session bridge during their migration.

## Resend configuration required from the project owner

1. Create or sign into [Resend](https://resend.com/).
2. Add a domain you own and complete Resend's DNS verification. Follow the
   [verified domain guide](https://resend.com/docs/dashboard/domains/introduction).
3. Create a sending API key. In the **Convex development deployment dashboard →
   Settings → Environment Variables**, configure:

   | Variable | Value |
   | --- | --- |
   | `AUTH_RESEND_KEY` | Your Resend sending API key |
   | `AUTH_EMAIL_FROM` | `Mlezi <auth@your-verified-domain>` using your actual domain |
   | `SITE_URL` | Exact frontend origin; initially `http://localhost:5173` |

   Signing variables `JWT_PRIVATE_KEY` and `JWKS` were generated locally and
   configured without printing their values. Preserve those existing variables.
   Keep email keys on Convex; never use a `VITE_` variable or paste a key in chat.
4. Leave open/click tracking disabled for these authentication emails.
5. Run `npm run convex:check` inside `frontend`. It reports variable readiness;
   this does not by itself prove that Resend accepts the sender or delivers mail.

## Activation after configuring email

Before switching, refresh the account-mapping export/import if new users have
registered with Flask since the last import. Operator commands from the project
root (choose a fresh private output path; the exporter refuses to overwrite):

```sh
backend/.venv/bin/python backend/scripts/export_convex_accounts.py --output /tmp/mlezi-account-mappings.json
npm --prefix frontend run convex:accounts:import -- /tmp/mlezi-account-mappings.json
```

The export contains only mapping metadata, not passwords/documents. Imports are
internal functions requiring CLI operator authentication, are idempotent, and
stop on role/ID conflicts. Treat the temporary export as private and remove it
after a successful import. The three initial mappings were already imported.

Then enable both sides together:

- `frontend/.env.local`: `VITE_AUTH_BACKEND=convex`
- `backend/.env`: `CONVEX_AUTH_ENABLED=true` and
  `CONVEX_URL=https://tidy-perch-115.eu-west-1.convex.cloud`

Restart Flask and Vite. In a controlled development browser, test real delivery
and the acceptance checklist below before treating this as a completed cutover.
For a hosted frontend, set `SITE_URL` to its actual HTTPS origin before testing
magic links there; redeploy/rebuild frontend environment changes as appropriate.

## Existing-user access

Existing Flask passwords were deliberately not imported. Existing users should
use **Email me a magic link** or **Email me a one-time code** first. After proof of
email ownership, their imported role and original Flask profile are retained.
They can create a Convex password using password signup with the same verified
email; this requires another email verification and preserves the account.
Forgot-password also supports imported accounts and passwordless users. For an existing account without a Convex password, the server prepares an inaccessible random reset target, sends the normal password-reset code, and lets the owner set their actual password only after email verification. Existing roles and profile mappings are retained. Unknown addresses receive the same generic UI response without creating credentials or sending email.

New email-only users choose caregiver or employer and enter their phone/name
after verification. For password signup, these details are prefilled from a
per-tab registration draft that contains no password and is removed after save.

## Temporary bridge to existing Flask features

This milestone moves authentication and account roles to Convex. Remaining
profile/marketplace APIs still use Flask until their migration is complete.

For each protected API request, the browser supplies its Convex token and an
auth-source header. Flask calls the configured deployment's authenticated
`accounts:me` query; that query checks a live, unexpired session and verified
email. The browser cannot provide its own trusted role, email or legacy ID.
Flask maps the resulting account to the existing local row, preserving ownership
and relationships, and performs the usual resource/role checks.

When Convex mode is enabled, old Flask signup/login/refresh routes and old bearer
tokens are rejected. A revoked Convex session therefore cannot continue through
an old Flask refresh token. A remote verification outage fails closed with a
retryable error rather than falling back to weaker authentication. No database
passwords or Convex tokens are stored in the mapping column.

Migration `c941f3a6d725` adds a unique nullable mapping column to `user`. Fresh and
copied SQLite migrations matched model metadata; the actual database was backed
up and upgraded with row counts preserved. The bridge adds one remote auth query
per protected API request; it is temporary, not the final backend architecture.

## Verification performed

- 67 backend tests passed, including native-session mapping, legacy account
  protection, old-token rejection, role permissions and fail-closed behavior.
- 11 Convex tests passed: account isolation, roles, verified-email linking,
  actual password hashing/sign-in/reset, OTP and magic-link verification,
  expiry/reuse, old-session revocation, send throttling and callback validation.
  Resend delivery was mocked; no real emails or charges occurred.
- Six UI tests passed for signup, verification, method switching, reset,
  invalid-link handling and revoked-session recovery.
- 25 existing/new Node API, consent and search tests passed.
- Five browser checks passed against the actual Convex deployment through an
  isolated local preview: password UI, magic/OTP choices, reset UI, safe
  unconfigured-email state, mobile layout, signup roles and invalid-link recovery.
- Frontend lint and both Flask-mode and Convex-mode builds passed. Compatible
  dependency patches were applied; the final install reported zero vulnerabilities.

### Real-email acceptance checklist

1. Password signup as caregiver/employer: receive a code, reject a wrong code,
   verify a correct code, and complete the account details.
2. Sign out and sign in with the new password. Reload and confirm your workspace.
3. Request an email OTP, verify it, and confirm the same account/profile opens.
4. Request a magic link, open it, and confirm the same account. Reusing a consumed
   link should show a retry screen. Check URL token removal and ten-minute expiry.
5. Forgot password: receive the reset code, set a new password, and confirm the
   previous password and earlier sessions no longer grant protected access.
6. Sign in as an existing user using OTP/magic link and confirm the imported role,
   saved caregiver/employer profile, existing contacts and other owned data.
7. Confirm caregivers cannot access employer/admin APIs, employers cannot access
   caregiver edit/admin APIs, and role tampering cannot promote an account.
8. Confirm users declining optional cookies can still complete all auth flows.

M-Pesa activation and live testing remain last.


## Recovery correction — 24 October 2026

An imported account could previously reach the reset-code screen without receiving an email because Convex's built-in reset requires a password credential. The request/resend steps now use `password-recovery`, which supports known imported/passwordless accounts and delegates verification, password hashing, and session revocation to Convex Auth's standard password-reset flow. The verification step remains on the native password provider. No recovery request grants a session before valid code verification.

Regression tests cover an imported admin account with no Auth credentials, passwordless account ownership and session revocation, invalid/reused codes, and unknown-address behavior. Fourteen Convex tests, six UI tests, lint and the frontend build pass. This correction was tested with mocked email delivery; the user requests their own fresh reset code from the form.

## Sign-in navigation correction — 24 October 2026

The session boundary now waits for Convex's server-confirmed authentication before querying the account. Once the account is ready, sign-in and registration routes redirect to `#/workspace` for password, email-code, recovery, and magic-link sessions. Existing browse/account/public-profile links remain intact. App also redirects authenticated users away from its sign-in route after loading their local account.

Validation: twelve auth UI tests pass, including signed-out to authenticated navigation, delayed server authentication, expired sessions, invalid links, and preserved deep links. Frontend lint and production build pass. These tests simulate authentication; no verification emails were requested and a live account sign-in remains for the user to confirm.
