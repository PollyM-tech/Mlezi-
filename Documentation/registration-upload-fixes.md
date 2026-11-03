# Local registration, image upload and identity changes

Implemented locally; no Convex deployment, provider settings or live account data were changed.

## Registration

Sign-in/signup email callbacks now use the browser’s actual origin. Backend redirect checks and private file CORS share an exact origin policy. `SITE_URL` is the primary website URL. Local `localhost` and `127.0.0.1` aliases at the same port are treated as the same development site only when `SITE_URL` is a loopback HTTP address. For additional explicitly trusted frontend origins, set comma-separated `APP_ALLOWED_ORIGINS` in Convex. Unlisted origins remain blocked; no wildcard was introduced.

For local Vite testing, configure backend `SITE_URL=http://localhost:5173`. If the same development backend must serve a hosted frontend too, keep its primary `SITE_URL` and explicitly add `http://localhost:5173,http://127.0.0.1:5173` through `APP_ALLOWED_ORIGINS`. Production should list production origins only. These backend settings require operator configuration; they were not changed by this task.

The form now explains Resend test-sender and unverified-domain errors without publishing the operator’s email or provider response. `onboarding@resend.dev` cannot deliver public registrations to arbitrary people. A verified sending domain and authorized sender are required for that. Missing frontend Convex configuration also has a visible setup message. Browser-storage cleanup failures no longer turn successful account creation into an apparent failure.

## Images and identity

The frontend derives the HTTP Actions URL from `VITE_CONVEX_URL` if `VITE_CONVEX_SITE_URL` is absent; incorrect cloud/HTTP URL combinations give a clear configuration error. Restart Vite or rebuild after changing frontend environment values.

The forms explicitly retain selected ID/selfie/photo files before entering the busy state. JPEG/PNG/WebP source photos up to 25 MB are decoded locally, resized to a maximum 2400-pixel dimension and encoded to JPEG before upload. The transmitted file is still limited to 5 MB. The backend retains authenticated access, ownership/purpose binding, quotas, independent image decoding, metadata removal and its own size limits. Unsupported phone formats should be exported as JPEG; corrupt images do not get uploaded.

Existing caregivers without an available stored ID can now upload an ID with their selfie in the identity form. Existing valid IDs cannot be replaced through that form; administrator assistance is still required. A lost storage file no longer counts as an uploaded ID just because its database row exists.

Once approved, identity/adult-age checking is a one-time account check. Display-name and profile-photo changes preserve approval. A display-name edit also leaves pending review intact. A photo change while review is pending invalidates that pending snapshot so an administrator cannot approve outdated photo evidence. Mandatory profile-photo access, administrator comparison, adult-age confirmation, suspension and account restrictions remain enforced. The badge describes evidence reviewed at approval time; it does not certify every later photo or display name.

## Retest locally

1. After reviewing backend changes, sync them yourself with `cd frontend && npm run convex:dev` when ready. This task does not deploy them.
2. Run `npm run dev`; use the origin configured in the backend. Create each role with an email your sender can deliver to, verify the code and complete account details/terms. Do not share codes or passwords.
3. Submit a caregiver profile with photo, ID, selfie and consent. Try a large supported phone image and a corrupt/unsupported file; the latter must produce an error without submitting a profile.
4. For a legacy/missing-ID profile, submit ID plus selfie from Identity check. Verify a valid stored ID is not replaceable there.
5. Approve an adult development caregiver through the normal administrator process. Change the profile name and photo; approval and adult-age confirmation should remain. Try a pending photo edit separately; that pending request must become invalid.
6. Confirm another account still cannot claim the uploads, access private documents or grant its own identity approval.

Automated tests use simulated email delivery and image fixtures. They do not prove live Resend delivery, deployed CORS configuration or a particular browser’s camera/gallery behaviour. The exact reported registration error is still needed to confirm any remaining deployment-specific cause.

## Confirmed email diagnosis

Read-only Convex/Resend checks confirmed that the configured test sender is correct and its API key can access the earlier delivery record. The latest inspected send request was rejected with HTTP 403 for the Resend test-recipient restriction: its recipient did not match the intended Resend account Gmail. The provider response identified the intended Gmail as the allowed test recipient. This was not a missing website domain, invalid key or sending-quota failure. Use the exact Resend-account email in the sign-in form and check browser autofill. No email was sent and no cloud configuration was changed during diagnosis. The local error message now distinguishes this recipient restriction from an unverified sending domain.

## Immediate sign-out

All website sign-out buttons now use one flow, including onboarding, missing-photo/restricted accounts, support, administrator MFA and the normal workspace. Sign-out starts server revocation, immediately removes this tab’s Convex credentials and registration draft, clears the API session bridge, detaches the old authenticated client and replaces the current URL with `/`. The homepage renders without waiting for a network response. Cookie preferences are preserved.

Server revocation runs in the background with a ten-second connection cleanup bound; an offline client cannot guarantee remote revocation. The local session is cleared regardless. A retired storage adapter ignores delayed writes/deletes from the old provider, preventing an earlier refresh or sign-out response from overwriting a new login. A new app visit gets a fresh Convex client rather than the previous account’s query cache. Browser Back returns to a signed-out application view.

Tests cover slow and failed revocation, immediate home navigation, credential removal, preserved preferences, Back navigation and stale-provider storage operations. Changes remain local until frontend deployment.

## Support mailbox supplied

The operator has created `support@mlezicare.com`. No cloud environment was changed by this task. Once `mlezicare.com` is verified for sending in Resend, configure these on the intended Convex deployment:

```text
AUTH_EMAIL_FROM=Mlezi <support@mlezicare.com>
SUPPORT_EMAIL_FROM=Mlezi Support <support@mlezicare.com>
SUPPORT_INBOX_EMAIL=support@mlezicare.com
```

Retain the valid `AUTH_RESEND_KEY`. The mailbox's existing incoming-mail DNS records must remain intact when adding Resend's sending-verification records. Until the sending domain is verified, the current Resend test sender can still be used for the Resend-account recipient only. Do not put API keys into Vite/public variables. No email or support notification was sent during implementation.

## Production signup diagnosis — 1 November 2026

Read-only checks of the connected deployment and Resend show that `AUTH_EMAIL_FROM`
uses `mlezicare.com`, while Resend reports the domain as **pending**. The latest
inspected `/emails` POSTs returned HTTP 403 for domain verification. The DKIM TXT
record is verified; Resend's `rsend` and `send` CNAME records are pending. Completing
these records at the authoritative DNS provider and verifying the domain in Resend
is required before public signup emails can be delivered. Do not replace the
support mailbox's existing incoming-mail MX records.

The reported `Account … already exists` error is a separate credential conflict:
the Password provider finds an existing email/password credential whose stored
password differs from the submitted password. A previous request can create that
credential before an email-send failure. Retrying signup with the original password
resumes verification; a forgotten/different password must use verified recovery.
Do not delete existing accounts or replace credentials based only on an email claim.

A thin error adapter preserves the library's Password implementation and translates
its duplicate-credential error into a client-visible `ACCOUNT_EXISTS` result without
including the email. The form offers explicit existing-account sign-in and password
recovery buttons, retaining the email and registration draft. Domain-verification
provider responses are recognized across HTTP error statuses. Neither improvement
bypasses email ownership or changes stored passwords automatically.

Regression tests cover a failed email followed by signup with a different password,
unchanged stored credentials, no premature session, retry with the original password,
verification completion, and recovery from the form. Domain errors with a non-403
validation status also receive an actionable message. Deploy both the Convex auth
changes and the frontend changes before expecting the new guidance on the live site.
No emails, credentials, account roles, DNS records or cloud configuration were changed
during this diagnosis; tests simulate email delivery.

## Magic-link and code redirect correction — 3 November 2026

The connected backend reports `SITE_URL=https://mlezicare.com`. The reported
`Invalid sign-in destination` is raised before sending an email when the form submits
another browser origin that is not in `APP_ALLOWED_ORIGINS`. It is separate from
wrong-password rejection and Resend's domain-verification state.

Code-based signup/sign-in and resend now omit `redirectTo`: users enter those codes
on the page where they requested them. Magic links use the current browser origin
only if the backend explicitly lists it among trusted origins; otherwise `/signin`
resolves against the canonical backend `SITE_URL`. The public auth settings expose
only these public origins, never credentials. Older backend settings safely fall back
to the canonical site too. The server's exact-origin redirect validation is unchanged;
untrusted hosts, protocol-relative external URLs and lookalike domains remain blocked.

For local magic links to return to a development browser rather than the main site,
configure the **development Convex deployment** with exact origins such as
`APP_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. Retain any other
intentionally configured entries. Production should keep production origins only;
no localhost or wildcard origin was added automatically. This setting also governs
private-file CORS, so use a dedicated development deployment for local upload tests.
Magic links opened on a different origin cannot use that origin's registration draft;
verified new users can still complete their account details on the destination site.

Regression tests cover canonical production magic-link completion, OTP completion,
OTP resend without redirects, an explicitly allowed local origin, legacy settings
and rejection of arbitrary/lookalike destinations. Tests simulate email delivery.
Update Convex functions and redeploy the frontend before testing the change live;
use a newly requested link/code after the update. No email or authentication attempt
was made against a real user's account during diagnosis.

## Stay signed in after account creation — 3 November 2026

Successful password verification, OTP verification and magic-link redemption already
create an authenticated Convex session. Creating the application's account record
uses that same session; it does not require a second credential submission.

The form now shows a signed-in handoff after successful authentication instead of
leaving the credential/code form available while auth state propagates. Account
completion explicitly replaces the signup URL with `/workspace`. Authenticated new
caregivers go to their required profile-photo setup at that URL, while employers go
to their workspace; neither is redirected to a fresh sign-in form. Administrators
still require their configured MFA confirmation. Email verification and explicit
terms acceptance remain required, and no terms are accepted automatically.

Regression coverage exercises all three signup methods for both account roles,
then registers the account and reads its session using the original verification
tokens without another sign-in. UI tests cover password/code handoff, employer
account completion, caregiver setup routing and successful magic-link onboarding.
Changes require frontend deployment; no real account or email was created by tests.

## Employer form reset correction — 3 November 2026

The session component previously changed the `accounts.current` query's `refresh`
argument on a 30-second interval. Each new query temporarily returned `undefined`;
the session loading screen then unmounted the application and cleared unsaved form
state. This affected caregiver-search filters and could also interrupt onboarding
and other forms. It was a component remount rather than a browser-page reload.

Ordinary accounts now use a stable reactive session subscription. Database changes,
including account restrictions and profile-photo requirements, still update it.
Explicit security-required events can request a recheck. Administrators receive their
MFA expiry from the backend and get a single deliberate recheck when that grant
expires; protected backend functions continue enforcing MFA independently.

Regression tests fill the real caregiver-search form, advance time across three
minutes of the former refresh windows, simulate an account-data update and assert
that the same fields and their values remain mounted. New-employer onboarding is
also checked. A separate test proves the timed administrator reauthentication still
occurs. No authentication credentials or optional-storage rules were changed. Deploy
the frontend and Convex account-query updates to apply the complete fix.
