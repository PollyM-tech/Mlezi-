# Mlezi administrator workspace

Entry: `https://mlezicare.com/admin-mlezicareaccess` (or the same path locally).
This path is excluded from search indexing. Its name is not an access control.
Every administrative query, mutation, evidence fetch and payment review requires a
verified account with a server-assigned `admin` role and a current MFA grant.
Public registration never assigns that role.

## Operator setup

The owner requested administrator access for `pmoraa431@gmail.com`. No account role,
password, cloud environment or authenticator enrollment was changed by this local
implementation. Existing administrators retain their roles and enrollments.

Deploy the Convex functions/schema to the intended deployment first, then deploy the
frontend to Vercel. Select the intended deployment in the Convex CLI before running:

```bash
cd ~/projects/nanny-marketplace/frontend
npm run convex:admin:setup
npm run convex:admin:provision -- pmoraa431@gmail.com
```

The commands above target the CLI's selected development deployment. If the website uses the production deployment, use `npm run convex:admin:setup -- --prod` and `npm run convex:admin:provision -- --prod pmoraa431@gmail.com` instead. Do not provision a different deployment from the website's `VITE_CONVEX_URL`.

The setup command retains an existing MFA encryption key. Back up this key securely;
rotating it without an enrollment-recovery plan would make existing MFA secrets
unreadable. The provisioning command calls an **internal** operator-only mutation,
reserving the email as an administrator or promoting the explicitly selected
existing account. It is idempotent and refuses restricted/deletion-pending accounts.
It creates no password, sign-in session or MFA bypass. Do not add it to a build step.

1. Open `/admin-mlezicareaccess` and choose **Forgot password** if a password has not
   already been set. Enter the owner's email, use the delivered code and choose a
   unique password. Alternatively, choose **Email me a one-time code** or **Email me a magic link**. These verify email ownership; they do not replace the separate authenticator code or grant an admin role. Administrator magic links return to `/admin-mlezicareaccess`. The email provider must be able to deliver to this address.
2. The verified email is linked to the pre-provisioned account. Another email cannot
   claim that role. Ordinary accounts get an access-denied screen.
3. Choose **Set up authenticator**. Add a time-based account named Mlezi in Google
   Authenticator, Microsoft Authenticator or another TOTP app by scanning the displayed
   QR code. Manual setup with the displayed key remains available. The QR is rendered
   locally in the browser from the server-provided enrollment URI; no external QR
   service receives the secret. Enter its current six-digit code to confirm enrollment.
4. MFA confirmation lasts 15 minutes for that sign-in session. Replayed codes are
   rejected; repeated wrong attempts are locked out. Never share a setup key or code.
5. Store the authenticator app's backup securely. Lost enrollment is reset only by a
   deployment operator after checking ownership, using the existing internal
   `adminSecurity:resetEnrollment` procedure. There is no public MFA-reset endpoint.

The authenticator produces a second-factor code, not a static password. No shared,
default or hard-coded administrator password is present in the application.

## Work queues

- **Overview:** reactive counters and priority notifications for pending identity
  checks, open support tickets, safety reports, privacy requests, manual payment
  reports and failed support emails. Overdue support and safety items sort first;
  support requests due within six hours are identified against the 48-hour target.
- **Identity checks:** compare the current profile photo, national ID and selfie side
  by side. Evidence is fetched through authenticated, audited file endpoints and
  private object URLs are revoked when closed, after 60 seconds or on unmount.
  Approval still requires matching evidence, a legible ID, date-of-birth validation
  showing age 18+ and explicit administrator confirmation. Rejection needs a reason.
  Approved identity checks remain one-time account checks; Premium does not verify
  identity. Human review is not an automated identity-authenticity guarantee.
- **Support tickets:** open an alert directly into its conversation; reply privately,
  resolve/reopen, inspect the provider queue and retry failed messages. Changes update
  live through Convex. Guest replies are emailed; signed-in customers use their
  private ticket conversation. Resolution remains a human decision.
- **Manual payments:** compare a reported receipt with the actual business statement
  before approval. Submission alone grants no access; existing server pricing and
  extension/idempotency checks remain in force.
- **Safety reports & reviews:** resolve reports and hide/restore reviews. Ratings are
  recalculated by the existing backend logic.
- **Accounts & privacy:** suspend/restore accounts, handle correction requests, inspect
  deletion requests and review security events. Existing deletion grace/purge rules
  continue to apply; this panel does not bypass them.
- **Email delivery:** find failed messages even when their ticket is resolved or not
  in the first queue page, retry them and open their ticket.

Notifications are live **in-app** work items while the dashboard is open. They do not
request desktop notification permission or send browser push while the app is closed.
Guest-ticket team notifications continue to use the configured private support inbox.
Counters read at most 101 rows per queue and display `100+` when capped. Notifications
show the first 20 prioritized items from those rows; full ticket queues are paginated.
Failed-email recovery shows the first 50 and advances as jobs are handled. The existing
identity, accounts, report and audit views show bounded batches; clearing pending
identity requests exposes the next batch automatically.

## Verification

Automated coverage checks unauthorized/non-admin/MFA access, operator provisioning,
first-login linking, public-registration role preservation, work queues/deadlines,
capped reads, notified-ticket resolution, failed-email recovery, private-evidence
cleanup and explicit identity approval. Existing tests cover evidence freshness,
underage rejection, MFA replay/expiry/lockout and payment idempotency.

Before production use, test the complete owner login and authenticator enrollment on
the intended deployment, a real test identity submission/rejection/approval, a guest
support email reply and manual-payment review against a test record. No live evidence,
email, account or payment was changed during local implementation.
