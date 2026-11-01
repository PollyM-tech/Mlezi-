# Private support tickets

Implemented 1 November 2026. Convex handles both account and guest conversations;
there is no new third-party helpdesk or Flask backend.

## Where users get help

- `/support/`: public support page, sign-in recovery instructions, guest submission
  and returning-guest lookup. Linked from public and account footers and legal pages.
- `/app/#/support`: account ticket history and conversation. Support remains
  accessible during caregiver photo setup, suspension and the deletion grace period.
- Administrators use the same application route for the status-filtered, paginated
  queue. Admin-panel navigation links to it. Current administrator MFA is required.

Users choose account, profile, identity, membership, technical, safety, privacy or
other. Replies appear as **Mlezi Support**, never an administrator’s personal email,
phone or account ID. Conversations are plain text; file attachments are deliberately
not accepted. Do not request IDs, passwords, OTPs or payment PINs through tickets.
Existing identity upload, privacy request and deletion workflows remain separate.

The public privacy notice now links to support rather than publishing an operator
email. `VITE_PUBLIC_SUPPORT_EMAIL` is no longer required by the production gate.
The operator’s legal details and final legal review are still required before launch.
No claim is made that this implementation alone satisfies every legal notice duty.
Authentication still needs a verified sending domain even if support email is private.

## Signed-out access and spam protection setup

Guest conversations do not require account creation. Successful submission returns
a reference and cryptographically random 256-bit access key. Download/save both;
neither is automatically stored in browser storage or placed in page URLs. The
database stores only the key’s SHA-256 digest. Anyone holding both values can read,
reply and resolve that guest ticket; keys cannot be recovered. A guest-provided
email is optional, private, unverified and does not establish account ownership.
There are currently no ticket email notifications or automatic account changes.

Before guest submissions can work:

1. Create a Cloudflare Turnstile widget for the actual frontend hostname. Include
   localhost only in a separate development widget if needed.
2. Set its **public** site key as `VITE_TURNSTILE_SITE_KEY` in the frontend build
   environment (Vercel and local `.env.local` as appropriate).
3. Set `TURNSTILE_SECRET_KEY` in the matching Convex deployment, never a `VITE_`
   variable and never a commit. Set `SUPPORT_ALLOWED_HOSTNAMES` on Convex to exact
   comma-separated frontend hostnames, without a scheme/path. Do not paste secrets
   into chat. Deploy frontend and Convex changes to their matching environments.
4. Test a guest submission, save access, return while signed out, reply from an
   MFA-authenticated admin, and confirm the reply is visible with the key only.
   Verify an incorrect key is rejected. Then attest `SUPPORT_FLOW_TESTED=true`.

Public submission is disabled until a frontend key exists; the server independently
fails closed unless its secret and allowed-hostname list exist. Every token is
validated server-side for success, expected hostname and action `support`.
No production bypass is provided. Cloudflare dummy test keys cannot satisfy the
production readiness check. Test tokens do not demonstrate real production readiness.

Turnstile loads only after the visitor chooses to load the guest anti-spam check.
The page and cookie/privacy notices explain the provider request. Hosting CSP
allows its script, iframe and connection domain. Declining optional cookies still
allows ordinary use and signed-in support; guest submission requires this check.

## Limits and permissions

Account owners can access only their own account tickets; admins need a current
MFA grant. Guest access requires the exact key/reference. Guest email never links a
ticket to an existing account. Public responses omit private identifiers and key
hashes. Only admin detail views expose the optional guest email, marked unverified.
Queries use indexed pagination, and conversations are bounded to 100 messages.

Creation allows five account tickets/day, with a global 100 guest tickets/day
budget and five per provided guest email/day after CAPTCHA validation. Replies
and status changes each have a 20/hour limit per account or guest ticket. Subjects
are limited to 120 characters and messages to 2,000. Queue limits may need tuning
with actual volume; no limit provides a complete denial-of-service guarantee.

Statuses are `open` (awaiting support), `waiting` (support replied), `resolved`.
An owner reply reopens the ticket. Either side can resolve or reopen it. Audit
events record action/actor/reference, without message text or access secrets.

## Retention and operations

The existing daily retention worker removes resolved tickets 90 days after their
last update, and other tickets after 180 days without activity. Each sweep handles
up to 100 tickets per status. Account deletion removes its account-linked tickets
and messages; account exports include those conversations. Anonymous guest tickets
are not linked to an account merely by email. Operators must independently handle
guest erasure requests and verify the appropriate access before disclosing data.

Admins must monitor the queue. There is no external notification, response-time
guarantee or emergency dispatch. Support cannot grant identity approval, change a
password or confirm payment by itself. Never use an unverified guest claim as proof.

Production also checks guest anti-spam readiness and actual support acceptance.
The remaining domain, operator, authentication-email, backup and monitoring launch
requirements continue to apply.

Verification covers account isolation, guest-key access, MFA, content/rate limits,
CAPTCHA failure/success and hostname/action checks, private export/deletion and
retention, plus UI submissions and configuration-disabled guest forms.

Provider reference: [Cloudflare server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
