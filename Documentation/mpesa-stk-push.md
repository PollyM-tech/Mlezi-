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

While an STK request is pending, the open membership screen reads its own payment status every five seconds for up to three minutes of visible-page checks. It pauses reads while the tab is hidden, avoids overlapping reads, and stops at confirmation or unmount. This updates the payment display without reloading the page, restarting the request or clearing other forms. The manual Check STK payment status button remains available after the automatic checks stop. Background provider reconciliation remains independent of the browser.
