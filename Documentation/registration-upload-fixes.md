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
