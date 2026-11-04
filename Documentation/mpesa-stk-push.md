# Direct Daraja M-Pesa STK Push

Implemented locally. This uses Safaricom Daraja directly, alongside the existing manual Paybill payment option. Paystack card/bank checkout remains separate and is not activated by this implementation.

## Configure sandbox first

Use the development Convex deployment for testing. Add the following in **Convex dashboard → Settings → Environment Variables**, not Vercel or browser variables. Do not commit credentials or paste them in chat.

| Convex variable | Sandbox value |
| --- | --- |
| `MPESA_ENABLED` | `true` only when ready for sandbox requests |
| `MPESA_ENVIRONMENT` | `sandbox` |
| `MPESA_SHORTCODE` | Safaricom’s sandbox business shortcode for the app |
| `MPESA_CONSUMER_KEY` | Daraja sandbox app consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja sandbox app consumer secret |
| `MPESA_PASSKEY` | Sandbox M-Pesa Express passkey |
| `MPESA_LIVE_APPROVED` | `false` |

`CONVEX_SITE_URL` is Convex’s built-in HTTP Actions URL. The callback is `<CONVEX_SITE_URL>/payments/mpesa/callback`; for tidy-perch-115 this is `https://tidy-perch-115.eu-west-1.convex.site/payments/mpesa/callback`. Use the URL of the actual deployment being tested, not necessarily this historical deployment. Publish the local functions/routes to that development deployment before external sandbox callbacks can reach them. The local Vite frontend can use the same development deployment.

The live business Paybill **4125123 must not be used as the sandbox shortcode**. The frontend needs no M-Pesa keys and no extra public payment variable. Its existing Convex URL identifies the backend.

## Test journey

1. Sign in with a disposable employer account and complete its profile. Open Membership.
2. Select KES 300 / 30 days or KES 500 / 90 days. For a caregiver test use the existing KES 500 / 365-day Premium plan after completing the profile/photo requirements.
3. Use Safaricom’s sandbox-approved phone details. Consent to the request and click **Send test STK request**. Sandbox simulator behaviour must not be treated as proof of a live phone prompt or real transfer.
4. Check the status. A pending transaction prevents a second STK request or manual receipt report. The browser does not continually reload the page. Background reconciliation checks pending transactions.
5. Verify simulated success is marked **Sandbox test confirmed** and does **not** extend membership. Cancelled/failed requests grant nothing. Callback body claims alone grant nothing.
6. Test timeout, duplicate clicks and signing in as a second account. An ambiguous initiation stays pending; do not retry payment blindly. Use Support/business reconciliation when initiation has no checkout ID.

All automated provider tests mock network calls. No real STK prompt or payment was initiated during implementation.

## Confirmation and safety

Plan price/duration and role are validated on the server. Initiation is rate limited; phone numbers normalize to Kenyan format. The server stores a pending attempt before contacting Safaricom, and reuses it for repeat requests.

Callbacks are untrusted hints. The backend independently queries Daraja with its own credentials and checks the checkout/request identifiers. Only that internal result reaches settlement. Successful production settlement extends the existing expiry (30, 90 or 365 days) atomically and once. It never grants identity verification or ratings. Private provider payloads/credentials are not returned to the browser or logged by these functions.

The callback body is size limited. Pending attempts are checked shortly after initiation and by a two-minute cron, with per-payment query throttling. Automatic reconciliation covers the first 24 hours; unresolved/unknown requests require operator investigation. No automatic refund or business-statement reconciliation UI is implemented. Direct STK transfers use a unique MZ account reference; administrators must not approve those same transfers again as manual mlezicare payments. Daraja STK query does not provide a trusted receipt in this implementation, so cross-channel receipt deduplication requires that business-statement check. Keep the manual payment option available for independently checked receipts, but never submit a second payment/report while an attempt is unresolved.

## Before live activation

Obtain live Daraja M-Pesa Express approval, live consumer credentials and passkey tied to Paybill 4125123. Sandbox credentials cannot authorize this Paybill. Set production Convex values separately: `MPESA_ENVIRONMENT=production`, `MPESA_SHORTCODE=4125123`, the live credentials, an HTTPS `SITE_URL`, and `MPESA_LIVE_APPROVED=true` only after approval. Keep `MPESA_ENABLED=false` until the operator is ready to receive real payments.

Deploy frontend and Convex together, verify callback reachability, then perform an explicitly authorized small live transaction, cancellation, duplicate-confirmation and renewal check against the business statement. This implementation has not completed those live checks and does not itself satisfy the wider legal, monitoring, backup or production launch gates.

Official reference: [Safaricom Daraja portal](https://developer.safaricom.co.ke/). Check the M-Pesa Express initiation/query documentation and sandbox simulator in your current Daraja app; portal content was not accessible to the implementation browser session.

## Read-only readiness command and status updates

After configuring and publishing the development backend, run from `frontend`:

```bash
npm run mpesa:check
```

This reads public backend readiness and prints the callback URL. It does not read or print credentials, request a provider token, or initiate an STK payment. A successful readiness check does not prove credentials or callback delivery work; perform the separate sandbox journey above.

While an STK request is pending, the open membership screen reads its own payment status every five seconds while the visible payment screen has a pending STK request. It pauses reads while the tab is hidden, avoids overlapping reads, and stops at confirmation or unmount. This updates the payment display without reloading the page, restarting the request or clearing other forms. STK status refresh is automatic; the manual Check STK payment status button is no longer shown. Returning focus to the browser or making the tab visible triggers an immediate stored-status read. When a terminal result arrives, payment history and membership data refresh, and the normal payment form returns. Pending requests continue to block duplicate payment attempts. The duplicate STK waiting/Refresh payment status/support block beneath the manual instructions has been removed. Manual payment reports update automatically every ten seconds while pending, without a refresh button. Background provider reconciliation remains independent of the browser.

## Stalled sandbox simulation recovery

An accepted initiation is not a completed payment or proof of a phone prompt. Pending attempts are persisted in Convex, so signing out does not remove them. Status queries that remain inconclusive now update the pending description; provider/network/reference-validation failures produce a clear unconfirmed-result message rather than preserving the original accepted message forever. No callback claim or query error grants membership.

For an owned `daraja_stk` request recorded as `sandbox`, **Close sandbox test** becomes valid on the server after three minutes. It marks that test unconfirmed/failed, audits the action and allows another deliberate test. It does not cancel a provider transaction, clear a live request, delete history or activate membership. Live transactions and another account’s requests cannot use this path. Late test confirmation cannot revive a closed test. Deploy Convex and frontend changes together before using recovery.

## Provider rate limits and operator diagnosis

`npm run mpesa:diagnose` performs a read-only check of the latest pending sandbox request using the selected Convex deployment’s credentials in process memory. It retrieves a provider token and queries status, but never sends an STK prompt or changes application records. It prints only HTTP/result codes and reference-match booleans, never secrets, phone numbers, reference IDs or response bodies. It refuses production mode and the live Paybill. Run only as a trusted deployment operator; avoid repeated diagnostic queries during a provider cooldown.

A read-only query on 3 November 2026 returned **HTTP 429** from the sandbox STK status endpoint. An earlier query returned a non-JSON response. These observations explain why those diagnostic calls could not confirm payment; they do not establish the result of the underlying request.

Status reconciliation now shares a minimum one-minute query spacing across all requests in each environment. A 429 response respects `Retry-After` (seconds or HTTP date), bounded to one minute–one hour, defaulting to five minutes when absent/invalid. Other accounts, manual status checks, callbacks and the cron share that cooldown. The background sweep prioritizes least-recently-checked records in its bounded batch. Requests remain pending during throttling, with a clear message; cooldown expiry never grants membership by itself. The browser’s five-second reads fetch stored state only and do not call Safaricom.

### Payment screen simplification — 4 November 2026

The sandbox-close explanation, Close sandbox test button and Get help with this payment link have been removed from the STK section at the owner’s request. Automatic status updates remain. The server-side sandbox-only close operation is retained, but the payment screen no longer exposes it. Earlier descriptions of that button reflect the previous UI.

### Automatic return to Payments — 4 November 2026

The STK component passes the confirmed/failed server record directly to the Payments page so its pending state clears immediately, then refreshes membership/history data. Reads resume immediately on browser focus/visibility after using the phone prompt. This updates the existing payment view without a full reload or sending another STK request. It does not treat prompt delivery as payment confirmation or bypass provider cooldowns.

### Temporary KES 5 account checkout test

The server can price STK checkout at KES 5 exclusively for
`paulinemoraa36@gmail.com`. Standard plan durations and benefits apply. Other
accounts and manual payment reporting retain standard prices. Payment does not
grant identity approval.

After deploying the local code to the backend used by the website, run from `frontend`:

```sh
npm run mpesa:test-price -- --enable
```

This sets `MPESA_TEST_PRICING_ENABLED=true` and a 23-hour
`MPESA_TEST_PRICING_EXPIRES_AT` deadline on the configured Convex deployment.
Add `--prod` only when targeting a Convex production deployment. This command
sets pricing configuration; it does not send a payment request.

Sign in as that account, open Payments and confirm that the STK price reads
KES 5. Select the intended plan, send one prompt, and approve it on the phone.
Live mode and approved live credentials are required for automatic membership
activation. Sandbox confirmation never activates membership. The backend checks
Safaricom, activates access once, and the page automatically refreshes status.
Verify the purchased contact access or Premium benefit as appropriate.

Restore normal pricing immediately after testing:

```sh
npm run mpesa:test-price -- --disable
```

Pricing also expires automatically. Already initiated authorized KES 5 payments
can settle after pricing is disabled. Restoring prices does not revoke benefits
already purchased. Never change the browser amount or global plan constants to
run this test.
