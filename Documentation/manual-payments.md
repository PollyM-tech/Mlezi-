# Manual M-Pesa payments — local implementation

The operator supplied **Paybill 4125123**, **account mlezicare** as the interim destination before Paystack integration. These are configuration facts supplied by the operator; this work did not independently verify business ownership, initiate a transfer, change cloud settings or deploy the feature.

## Plans and activation

| Account | Plan | Price | Term |
| --- | --- | --- | --- |
| Employer / parent | Contact access | KES 300 | 30 days |
| Employer / parent | Contact access | KES 500 | 90 days |
| Caregiver | Optional Premium visibility | KES 500 | 365 days |

A signed-in member opens Membership, selects a server-priced plan, pays using M-Pesa's Pay Bill menu and enters the receipt code and paying phone. The report stays **pending** and grants no entitlement. The UI explicitly warns against another payment while a report is pending. It asks for a receipt code, not a PIN, OTP, complete SMS message or document attachment.

An administrator with a current authenticator confirmation opens **Manual M-Pesa confirmations** in the administrator workspace. The administrator must compare the receipt, exact plan amount, sender phone and destination against the actual business statement before confirming. The app cannot establish that money arrived from a typed receipt alone. Confirmation activates the selected entitlement. Rejection requires a reason visible in the member's private history, and permits a corrected report. Rejection does not reverse an M-Pesa transaction or issue a refund; mistaken/duplicate/unrecognized payments go through Support for investigation and any separate refund action.

Expiry is `max(current expiry, approval time) + plan duration`: early renewal extends the remaining term. Previously unlocked contacts stay accessible after ordinary employer expiry. Premium changes only paid visibility; it does not grant an identity badge, adult-age approval, ratings or guaranteed work.

## Controls

- Account role, amount, duration and entitlement type come from the server's plan catalogue.
- Only verified, permitted accounts can submit; caregivers must have their required profile photo. Restricted/deleted accounts cannot be activated.
- Receipt references are normalized to uppercase. An active receipt claim cannot be shared across accounts or reused after confirmation. Repeating the same pending report is idempotent.
- Only one pending manual report per account is allowed, with a five-report daily limit.
- Approval, expiry update and audit record are one Convex mutation. Repeated approval cannot extend expiry twice. An administrator must explicitly confirm the statement comparison.
- Payment history is visible only to its owner and the MFA-protected administrator review queue. Paging bounds the admin queue to 25 reports at a time.
- Manual reports use `provider=manual_mpesa` in the existing payments table, with optional review metadata and a provider/status index. Legacy payment rows remain compatible.

`payments_enabled` / health `paymentsEnabled` remain false for **automated checkout**; `manual_payment.enabled` / health `manualPaymentsEnabled` separately describe this manual flow. Automated M-Pesa initiation endpoints remain disabled. No Daraja credentials or Paystack keys were added.

## Testing and rollout

The implementation is local. After reviewing the changes, sync Convex functions/schema to the intended development deployment and deploy the frontend before expecting the live website to show them. Production legal/operator/provider setup is still a separate launch step.

```bash
cd frontend
npm run test:convex
npm run test:auth-ui
npm run lint
npm run build
```

For development acceptance testing, use disposable test accounts and administrator access. Confirm that a report remains inactive before review, wrong-role users cannot review, MFA expiry blocks review, incorrect receipts can be rejected with a reason, and a completed receipt cannot be used again. Confirm both employer durations and caregiver Premium; use development-only fixture data rather than making a real transfer just to test the software. The administrator must use the real business statement for any actual paid activation.

Automated tests cover server pricing, no activation at submission, authorization/MFA, duplicate/reused receipts, idempotent approval, rejection/correction, account restrictions, missing photos, 30/90/365-day terms, early/expired renewal and separation from identity/ratings. UI tests cover the payment instructions, explicit payment declaration, pending state, refresh and administrator confirmation/rejection validation. Browser layout checks use sample data only.

Validation completed locally: 62 backend tests and 68 UI tests passed, along with lint and the production build. Twelve targeted membership/admin layout checks passed in Chromium and WebKit at 320, 390 and 1440px widths. Those checks caught a long submit button widening the phone layout; the membership card and buttons now wrap correctly. No real transfer or live provider verification was performed.
