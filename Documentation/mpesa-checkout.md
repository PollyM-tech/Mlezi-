# Simple M-Pesa checkout

Updated locally on 4 November 2026. The checkout shows a plan, amount, M-Pesa phone field, required Terms of Service agreement and **Send payment request**. The terms link opens Mlezi’s `/terms/`; Truehost’s design is a reference, not the terms governing Mlezi.

The request button stays visible while pending. It is disabled for an unresolved live request to prevent duplicate charges. A sandbox request older than three minutes can be explicitly replaced through the same form: the backend closes the previous test, audits replacement, requires fresh terms agreement and creates the next attempt atomically. Existing records and live transfers are not deleted or cancelled. Rate limits still apply.

## Consent and confirmation

The server requires `termsAccepted=true` and the current shared `LEGAL_VERSION`. The timestamp and terms version are stored on each new payment attempt. Browser validation alone cannot authorize a request. Prices and durations come from server plans, not a client amount.

After sending, the page reads stored payment status every five seconds and on browser focus/visibility, avoiding concurrent or hidden-tab reads. When the final result arrives, membership and history refresh together and the form returns. Reads do not initiate another prompt or call the provider directly.

The callback route is `/payments/mpesa/callback` on the deployment’s Convex HTTP Actions origin. Callback claims trigger independent server queries; they do not grant membership. The background cron reconciles pending attempts every two minutes. Queries share a one-minute minimum spacing per environment and respect provider HTTP 429 `Retry-After`, bounded to one minute–one hour, with a five-minute fallback. Numeric and string result codes are parsed as numbers; an earlier result-code regex in this checkout could ignore a legitimate numeric result and has been corrected.

Sandbox success records a test result without activating membership. Production settlement uses the existing server-priced plan and extends expiry once, even when confirmation repeats.

## Sandbox before live

Keep sandbox configuration while verifying initiation, callback reachability, matched query references, successful and cancelled outcomes, retry limits and duplicate handling. Automated tests mock Safaricom: they do not prove actual delivery or a live transfer. A persistently unavailable sandbox service is a provider issue to investigate, not a reason to treat an unconfirmed request as paid.

Approved live credentials for Paybill **4125123** belong only in the live Convex environment. When ready for a controlled live test, the operator configures `MPESA_ENVIRONMENT=production`, `MPESA_SHORTCODE=4125123`, the approved live consumer key/secret/passkey, HTTPS `SITE_URL` and `MPESA_LIVE_APPROVED=true`. Enable `MPESA_ENABLED` only when ready. Never put payment secrets in `VITE_` variables or Git. Publish backend and frontend together because new payment requests require terms consent. No live configuration, prompt or transfer was performed for this change.

Official integration reference: [Safaricom M-Pesa Express](https://developer.safaricom.co.ke/apis/MpesaExpressSimulate).

## Fixed KES 5 terminal test

From `frontend`, the operator can preview a separate provider test:

```bash
npm run mpesa:test -- --phone YOUR_TEST_NUMBER
```

Preview performs no network operation. Add `--send` only when ready to send one KES 5 prompt. Production configuration requires `--live` as well. The selected environment file must contain the credentials and shortcode for that mode; the command never changes Convex variables or membership prices. For a separate live credential file, use Node directly:

```bash
node --env-file=.env.mpesa-live.local scripts/test-mpesa.mjs --live --phone YOUR_NUMBER
```

The command above is still a preview. Add `--send` only for an authorized real KES 5 test to Paybill 4125123. Do not place credentials or a PIN in command arguments or chat. Keep private environment files ignored by Git.

After one minute, run `npm run mpesa:test -- --check` for sandbox, or the equivalent Node command with the same live environment file and `--live --check`. Status checking never sends another prompt. A private `.mpesa-test/payment.json` record prevents another send, preserves uncertain initiation, and respects query cooldowns. Do not delete that record or blindly resend while its result is unresolved.

This direct provider test uses reference `MLEZI5TEST`, is not attached to an application membership and grants no paid access. The existing HTTP callback may acknowledge it without a matching application record; confirm its result using the terminal query and, for a live transfer, the business statement. It tests provider connectivity and the phone prompt; it does not replace the full membership checkout test.

### Switching from sandbox to live

An old pending sandbox record no longer blocks a production checkout or selects its plan. The record remains in history as an inactive sandbox test; it is not silently marked paid or deleted. Pending production and legacy/unknown-environment payments continue to block duplicate requests. No live payment or cloud record was created while implementing this behaviour.
