# Private support tickets and email follow-up

Updated 1 November 2026. Convex handles tickets; Resend sends acknowledgements,
team notifications and support replies. No Flask or separate helpdesk is required.

## Visitor journey

Click Support in the footer to open `/support/`. A signed-out visitor enters an
email, issue category, subject and message, completes spam protection, and submits.
The page confirms receipt and shows a ticket reference. No account or saved access
key is required for this email workflow.

The automatic email says:

> Thank you for contacting Mlezi Support. We have received your issue. Our team
> will address it within 48 hours and follow up with you by email.

It also includes the ticket reference and a reminder not to send passwords, OTPs,
identity documents or payment PINs. It does not echo untrusted issue text or links
back to an unverified email recipient. Forty-eight hours means elapsed hours; it
is a support-team commitment, not automatic problem resolution.

Signed-in users retain account ticket history at `/app/#/support`. Admins use the
same route for their private queue and reply as Mlezi Support. Guest replies from
admins are saved to the thread AND queued for email delivery. An optional team
notification is sent to the configured private inbox for each new guest issue.
The admin queue shows oldest tickets first and displays the 48-hour follow-up due
at time. Admin MFA is required.

The inbox and operator phone number are not displayed on the website. Email
recipients necessarily see the sender/reply address. Use a business support sender
for launch. Direct email replies go to the team's configured inbox; incoming email
is not automatically imported into the Convex conversation. Staff can also follow
up directly from that inbox. Email claims never prove account ownership.

## Configuration, without deploying to Vercel first

Local frontend testing is supported. Create a development Turnstile widget that
allows `localhost`; configure the same hostname on the development Convex backend.
Keep production and development widgets/deployments separate.

Frontend build environment (`frontend/.env.local` and later Vercel):

- `VITE_TURNSTILE_SITE_KEY`: public widget key.

Matching Convex deployment environment:

- `TURNSTILE_SECRET_KEY`: secret widget key.
- `SUPPORT_ALLOWED_HOSTNAMES`: exact comma-separated frontend hostnames, without
  scheme, port or path. For local testing this includes `localhost`.
- `SUPPORT_INBOX_EMAIL`: private team inbox for new-ticket notifications and replies.
- `SUPPORT_EMAIL_FROM`: optional dedicated sender; falls back to `AUTH_EMAIL_FROM`.
- `SUPPORT_RESEND_KEY`: optional dedicated API key; falls back to `AUTH_RESEND_KEY`.

Never put secrets/private team email in `VITE_` variables, commit them or paste
keys into chat. No new npm package is needed. Turnstile remains independent of
email follow-up; it protects a form that accepts submissions without signing in.
It loads only when a visitor chooses the guest spam check, as described in the
privacy and cookie notices. Server validation checks success, hostname and action.

For real visitor emails, verify a sending domain in Resend. The `resend.dev` test
sender is restricted and cannot establish public delivery readiness. Frontend
hosting is not required to verify a sender, but a domain you control is needed.
The team inbox can be an existing Gmail mailbox while preparing the business inbox;
this does not permit sending FROM Gmail through Resend without domain verification.

Production checks require a non-test support sender, private inbox, guest spam
configuration and `SUPPORT_FLOW_TESTED=true` after real acceptance. Existing legal,
backup, monitoring, production Convex and authentication checks still apply.

## Email reliability and visibility

Ticket creation and email-job creation commit together. Background jobs retry
provider failures up to three attempts, using a stable Resend idempotency key.
Retries finish within minutes; Resend's idempotency window is 24 hours. Manual
retries after that window can resend an email if an earlier result was ambiguous.
Jobs show pending/sending/sent/failed in admin ticket details; a failed job can be
retried by an MFA-authenticated admin. Sent means provider acceptance, not proof of
inbox delivery. Administrators must monitor failures and their inbox; delivery
webhook/bounce tracking is not implemented.

A worker lease recovers interrupted sends. A separate budget limits support mail
to 20 attempts/minute and 200/day, alongside existing ticket/reply limits. Provider
credentials, message text and recipient addresses are not logged by these workers.
If email configuration is absent, the public action rejects before creating a new
email-oriented ticket. Guest email is normalized and required on that public API.

## Privacy, limits and retention

Account owners access only their own tickets. Guest email is private and unverified;
it never links a ticket to an account. Legacy guest access-key API support remains
for already-created conversations; the new form does not require saving those keys.
Admin detail responses alone expose guest email and delivery status. File uploads
are not accepted. Support does not approve identities, reset passwords or confirm
payments by itself.

Five account tickets/day and 100 guest tickets/day are permitted, with five guest
submissions per provided email/day. Replies/status changes have 20/hour limits;
subjects allow 120 characters, messages 2,000 and threads 100 messages. Reads use
indexed pagination. An unverified address and CAPTCHA are not complete protection
against abuse; monitor actual volume and provider budgets.

Daily retention removes resolved tickets after 90 days without updates and other
tickets after 180 days. Each sweep handles up to 10 tickets per status. Account
exports include account-linked support conversations. Account deletion removes
those tickets, messages and queued-email records in batches of ten. Retention does the same for
expired guest tickets. Workers check that a ticket still exists before sending;
an email already handed to its provider cannot be recalled. Guest deletion requests
require appropriate verification; matching an unverified email is insufficient.

There is no emergency dispatch, automatic incoming-email ingestion, or guarantee
that a provider-accepted email arrived. Keep final operator/legal notices under
review for the real business. A public personal contact email is not required by
the app's production checker.

Verification covers account isolation/MFA, required guest email, CAPTCHA validation,
48-hour acknowledgement content, team routing, admin reply routing, retry limits,
idempotency headers, deletion suppression, privacy export/retention and form UX.
No real emails are sent by these automated tests.

References:

- [Resend sending API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Cloudflare token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## Support and authentication verification — 1 November 2026

Read-only checks against the connected Convex deployment report email authentication,
production sender configuration, support email configuration and guest spam protection
as configured. The public `https://mlezicare.com/support/` page returns HTTP 200 and its
frontend bundle contains a Turnstile Site Key. These checks do not establish actual
provider delivery or completion of a human Turnstile challenge.

Local reliability improvements let visitors retry failed Turnstile loading without
refreshing or losing their message. Expired/timed-out checks clear the submission
token, and removed widgets cannot supply stale tokens. The compact widget fits small
phones. Sign-in/create-account pages now link directly to guest support.

Automated tests cover signup verification, returning password sign-in, OTP and magic
links, password recovery, continuation after temporary signup-email failure, private
ticket permissions, guest challenge validation, acknowledgements, email retries and
administrator replies. Email delivery and Cloudflare responses are simulated.

After deploying the frontend changes, perform these live checks with an inbox you
control (never share passwords, codes or keys):

1. Create an employer account using password, enter the received verification code,
   accept the terms and confirm the employer workspace opens. Sign out, then sign in.
2. Create a caregiver with a different test email, verify it, complete account details
   and confirm the profile-photo gate appears. Repeat signup with OTP and magic link
   using separate test accounts; confirm the chosen role/name/phone persist.
3. For an existing account, test OTP, a magic link and Forgot password. Check a used or
   expired code/link is rejected and a fresh one succeeds.
4. While signed out, submit a support request after passing Turnstile. Check the ticket
   reference, acknowledgement promising a response within 48 hours, private team inbox
   notification and administrator queue. Reply as an MFA-verified administrator and
   confirm the reply reaches the visitor's inbox.
5. Submit a signed-in ticket and confirm another ordinary account cannot see it.

No live account, email, ticket, deployment or cloud environment was changed during
this verification. Frontend deployment and the above live checks remain outstanding.
