# Memberships, discovery, contacts, and public reviews

Implemented 23 October 2026 on the existing Flask/React stack. The approved
pricing and contact-access rules remain in section 13 of the technical document.

## Delivered behavior

- Employer registration and workspace, public caregiver discovery, category and
  arrangement filters, live-out location, minimum experience and pay filtering,
  paginated results, and private employer shortlists.
- KES 300 / 30-day and KES 500 / 90-day employer contact-access passes.
- KES 500 / 365-day caregiver Premium membership. Membership never changes
  identity-check status or ratings. The old KES 100 boost is no longer offered.
- Manual renewals extend from `max(now_utc, existing_expiry)` by the purchased
  duration. Access is active only when expiry is strictly later than now.
- Permanent, unique employer/caregiver contact unlock records. An existing unlock
  remains accessible after expiry; an active pass is required for a new unlock.
- Employer filters apply before Premium priority. A random rotation of the
  matching Premium tier changes exposure on new searches; signed one-hour search
  tokens reuse the order during pagination. Membership expiry or profile changes
  may change live results. This is visibility, not an employment guarantee.
- Public 1–5-star employer reviews with first-name attribution. Prior contact
  unlock is required, regardless of current subscription expiry. One editable
  review per employer/caregiver; average/count are recalculated transactionally.
- Caregiver replies, abuse reports, and administrator hide/restore controls.
  Hidden reviews are excluded from averages and cannot be republished by editing.
  Moderation actions are recorded with the acting admin and timestamp in reports.
- Official `frontend/src/assets/logo.png` used in header/footer. The supplied
  `favicon.svg` contains PNG bytes, so the same supplied image is also served as
  `favicon.png` with the correct MIME declaration. Source assets are preserved.

Identity checking remains a separate workflow: payment does not verify someone.
Existing verified statuses are displayed as “Identity checked”. A new identity
submission/admin-approval workflow is not included in this milestone.

## API

All paths below are under `/api`. JWT authorization is enforced on the server.

| Endpoint | Access / behavior |
| --- | --- |
| GET /caregivers | Public filtered, paginated, Premium-prioritized discovery |
| GET /memberships | Signed-in employer/caregiver plans and current entitlement |
| POST /payments/unlock-pass | Employer: server-owned `plan_code` and payer `phone` |
| POST /payments/caregiver-premium | Caregiver with profile: yearly Premium purchase |
| GET /payments | Own latest 30 payments; no payment credentials or checkout IDs |
| GET /payments/:id | Owner only; reconciles pending requests against Daraja |
| POST /payments/mpesa/callback | Callback hint; authenticated provider query required |
| GET /contact/unlock/:caregiver_id | Employer: previously unlocked contact or eligibility |
| POST /contact/unlock/:caregiver_id | Employer: unlock with active pass, or read prior unlock |
| GET /shortlist | Employer's own saved profiles |
| POST, DELETE /shortlist/:caregiver_id | Save/remove profile; free for employers |
| GET /caregivers/:id/reviews | Public reviews, average, count, pagination |
| PUT /caregivers/:id/review | Eligible employer: create/update own public review |
| GET /caregivers/:id/review/mine | Employer's own review |
| PUT /reviews/:id/reply | Reviewed caregiver only |
| POST /reviews/:id/report | Authenticated caregiver/employer abuse report |
| GET /admin/reports | Admin only |
| PUT /admin/reports/:id | Admin report status |
| PUT /admin/reviews/:id/visibility | Admin hide/restore and rating recomputation |

Search now includes keyword, category, arrangement, live-out location, experience,
budget with a required matching pay period, day, skill, rating and identity-check
filters. See [employer workspace notes](employer-implementation.md) for the current
API and private employer account/dashboard/contact endpoints.

M-Pesa setup and live payment testing are explicitly deferred to the final stage.

## M-Pesa configuration and verification

The code includes real Daraja sandbox/production STK Push and query integration.
**Live sandbox verification is still required. No Daraja credentials were
configured when this milestone was implemented, and no real payment was made.**

Add the following to `backend/.env` using `backend/.env.example` as a reference:

```dotenv
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=<your sandbox app key>
MPESA_CONSUMER_SECRET=<your sandbox app secret>
MPESA_SHORTCODE=<your sandbox shortcode>
MPESA_PASSKEY=<your sandbox passkey>
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_URL=https://your-public-backend/api/payments/mpesa/callback
```

The callback must be publicly reachable over HTTPS; localhost is not reachable
by Safaricom. Restart Flask after changing `.env`. Use sandbox credentials first.
Missing configuration produces a clear 503 error without creating a payment.
No frontend environment variable may contain M-Pesa or Cloudinary secrets.

The backend selects the amount/duration and stores the purchase plan. Client
prices are ignored. Callback result codes, receipt numbers, phone numbers, and
amounts are not trusted for granting access: the backend queries the stored
CheckoutRequestID using its own Daraja credentials. Only an authoritative success
extends membership. Conditional payment updates and a locked entitlement update
make repeated/concurrent successful confirmations idempotent.

Pending requests are queried at most once per 10 seconds. The UI polls for four
minutes and then provides a manual status check; a pending request can be resumed
from payment history after reload. For delayed callbacks, run:

```bash
cd backend
source .venv/bin/activate
flask --app app:create_app reconcile-payments
```

Schedule this command operationally if regular background reconciliation is
needed. Network/provider failures keep transactions unconfirmed; they never grant
access. A definitely rejected initiation is marked failed and can be retried.
If a request timed out after it may have been accepted but no checkout ID was
received, it remains pending and blocks duplicate purchase attempts. An operator
must reconcile that case with Safaricom merchant records before any retry; it
must not be treated as a safe automatic failure. The authoritative STK checkout
ID is retained for traceability; callback receipt text is not treated as verified
payment evidence. Refunds/reversals and automated merchant-ledger reconciliation
are future operational work.

## Database and operator setup

Migration `e48c16d972ab` adds Premium expiry, purchase plan snapshots, payment
query timestamps, review names/replies/update times, and unique review pairs.
Historical featured-boost fields/records are preserved but grant no new Premium
benefit. PostgreSQL adds the new payment enum value without rewriting old data.

The migration was tested on a fresh SQLite database and a copy of existing local
data, then applied locally after a private backup under `backend/instance/backups/`.
The backup directory is ignored by Git. PostgreSQL migration/concurrency behavior
still needs staging validation before production. To migrate another checkout:

```bash
flask --app app:create_app db upgrade
```

Create a new administrator interactively (no public admin registration):

```bash
flask --app app:create_app create-admin
```

This command does not promote or modify an existing account. Sign into the app
with the new admin to review reports and control review visibility.

## Checks and manual acceptance

Backend: `.venv/bin/python -m unittest discover -s tests -q` from `backend`.
Frontend: `node tests/api.test.mjs`, `npm run build`, and `npm run lint` from
`frontend`. Tests use isolated databases, generated fixtures, and mocked Daraja;
no test account is added to the local database.

Before production, complete browser/mobile QA and a real sandbox flow covering
successful payment, cancellation, delayed callback, renewal before expiry, two
simultaneous callback/status requests, and access to prior contacts after expiry.
Also review authentication hardening, endpoint rate limits, backups, public HTTPS,
CORS, and operational payment reconciliation. Identity approval and account/data
deletion remain separate implementation work.
