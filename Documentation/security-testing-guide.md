# Mlezi cookie and security testing guide

## What is ready

Cookie accept/decline/revocation, optional-font/search controls, native Convex authentication/authorization, admin TOTP, private identity evidence, upload validation/quotas, report handling and privacy controls are implemented. This round also makes expired consent reopen the banner, treats duplicate consent cookies as untrusted, applies hosting security headers to local preview, and explicitly denies environment/private-backup files in the development server.

`npm run security:check` runs the existing Convex tests, UI/session/consent tests, static cookie/search/header checks, lint and build. Passing automated checks is a baseline for a human test, not a penetration-test certification.

## Before giving your friend access

1. Use a separate test deployment and synthetic accounts/data. The existing development deployment contains migrated account information and an identity document; do not give a tester broad administrator access to those records. Prepare a clean test dataset rather than cloning private IDs into staging.
2. Agree the exact Mlezi test URL, test accounts, dates and a low request rate. Scope is the Mlezi app and its own tenant functions—not the infrastructure of Convex, Resend, Paystack or Safaricom. Do not run denial-of-service, bulk password guessing or scans outside that scope.
3. Keep all payment flags disabled/test-only. This guide does not activate checkout or initiate a transaction. Do not supply real payment PINs or card details.
4. Use two employer accounts (A/B), a caregiver account (C) and a separate administrator test account (D). The friend should use their own test inbox/account; do not share your owner password, authenticator seed, OTPs, API keys or browser session storage.
5. Email verification still requires working delivery. The Resend test sender only permits the owner inbox. A friend cannot complete signup/OTP/reset with a separate inbox until a sending domain is verified and delivery is working; do not bypass email verification to make testing easier.
6. An owner/operator must enroll the test administrator's authenticator. Do not create an admin through public signup. Never approve synthetic identity evidence in the real/public deployment.

### Recommended: private HTTPS staging

Host the built app on a private test URL with the prepared security headers. Configure its Convex `SITE_URL` and frontend Convex URLs for that isolated deployment. Verify only the intended testers have access at the hosting layer. Do not mark public-production check flags complete just to publish a test site. Use the hosting provider's private/preview deployment controls; no deployment is created by this guide.

After configuration:

```bash
cd frontend
npm run security:check
npm run security:headers -- https://YOUR-PRIVATE-STAGING-URL --require-https
```

The second command makes one homepage request and checks response headers. It does not test business authorization or prove that the rest of the site is secure.

### Local or same-Wi-Fi testing

Start a built preview rather than exposing the development/HMR server:

```bash
cd frontend
npm run test:preview
```

Open `http://127.0.0.1:4173`. To let a friend on the same trusted network reach it, stop that preview, then run:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

Give them your computer's LAN address and port 4173. Do not router-forward the port or publish the development server to the internet. Keep source files and the private backup on your machine. Convex `SITE_URL` must match the exact test origin for magic-link redirects/private-file CORS; use an isolated test deployment so changing it does not break another tester's environment.

Local HTTP preview applies CSP/framing/MIME/referrer/permissions protections and no-store responses. It deliberately omits HTTPS-only HSTS and request upgrading. It cannot validate TLS, HSTS or Secure-cookie behavior. Complete those checks separately on HTTPS staging.

## Functional/security test cases

Use browser developer tools or an intercepting proxy only against the agreed test URL. For captured API calls, replay your own synthetic account requests; change one field at a time. UI visibility is not the access-control test—verify the server refuses the forbidden operation too.

| Test | Steps | Expected result |
| --- | --- | --- |
| No consent | Clear site cookies/storage; reload. Inspect Network and Application. | Consent banner appears. No optional Google Fonts requests or saved search filters. Normal app/Convex traffic can still occur. |
| Decline | Decline, browse, sign in and refresh. | Essential sign-in works; optional fonts/preferences stay off. The declined choice persists. |
| Accept/revoke | Accept; save a filter; reopen Cookie settings and decline. | Fonts/preferences are enabled only after accepting, then optional search storage is cleared and further optional font use stops. Auth storage survives. Already completed network requests cannot be undone. |
| Expiry/corrupt preference | Remove/expire the preference cookie, return focus to the page; try an old/invalid cookie value. | Optional use stops and the banner asks again. Duplicate consent cookies do not silently opt in. |
| Cookie attributes | Inspect `mlezi-cookie-consent` on HTTPS. | Path=/, SameSite=Lax, Secure, 180-day duration and no Domain attribute. This is a readable preference cookie, not an auth credential. Convex auth uses sessionStorage, so an HttpOnly auth-cookie assertion does not apply to this architecture. |
| Cookie tampering | Set arbitrary cookies such as `role=admin` or change the consent value. | No role, membership, adult status or contact permission is granted. Only optional consent behavior can change. |
| Signup/recovery | Exercise password signup, verification, email OTP, magic link, forgot password and changed password with test accounts. | Codes/links must be valid, unexpired and unused. Invalid/reused proofs grant no access. No passwords/codes appear in app logs. |
| Logout/revocation | Capture a protected request, sign out, then replay the captured old test token. | Protected functions reject the revoked session. A stale failed request must not sign out a newly signed-in different account. |
| Cross-account access | Employer A saves/edits its data; attempt to retrieve/update it using employer B's session. | B cannot retrieve A's shortlist, contacts, account details or private data. |
| Role escalation | With employer/caregiver accounts, call admin functions or add a role/admin field to profile payloads. | Server refuses privileged operations; public signup cannot create an administrator. |
| No caregiver photo | Sign in as a caregiver with no profile; change the hash to browse/workspace directly. | Limited setup/privacy/sign-out view only. Direct protected function calls enforce the photo requirement. |
| Identity/adult review | Upload clearly synthetic test images in the isolated tenant. Try approval with missing images/confirmations, missing DOB, under-18 DOB and the exact 18th birthday. | Missing/underage evidence is not approved. Pending caregivers are hidden from employers and contacts cannot be unlocked. Exact threshold is calculated using Kenya's date. |
| Changed identity | Approve an adult test caregiver, then change name/photo. | Approved identity/adult confirmation remains. A photo change while review is pending invalidates that pending submission; a display-name change does not. |
| Private documents | Request ID/selfie bytes anonymously, as employer, as another caregiver and as admin before/after MFA. | Only a live authorized admin with current MFA receives bytes. Successful access is audited; responses use no-store. Public profiles never expose evidence storage IDs/URLs. |
| Admin MFA | Use invalid/reused authenticator codes and an expired grant. | No privileged access. Failed attempts persist, five failures impose a ten-minute lock, replayed time steps are rejected and grants expire after 15 minutes. Test on a dedicated account, not the owner's primary admin. |
| Malicious upload | Try an HTML/SVG/text file named `.jpg`, truncated PNG, empty file, >5 MB image, excessive dimensions, wrong MIME and another user's upload ID. | Invalid content/ownership is rejected. Valid uploads become metadata-free JPEGs. Observe quotas through a small controlled test; do not flood the service. |
| XSS payload | Put a harmless text marker such as `<script>alert('mlezi-test')</script>` in your own synthetic bio/review. | It is displayed as text; it does not execute. Check both public and administrator views. Delete the synthetic marker after recording the result. |
| Review/report permissions | Try review without unlocking, duplicate pair reviews, editing another employer's review and hiding reviews as a normal user. | Unauthorized changes fail; one review per pair and automatic rating aggregates remain correct. Only admin can moderate. |
| Privacy/deletion | Export account summary; request deletion; confirm hiding/restriction; cancel during seven-day grace period. | Export belongs to the requester, excludes credentials/other people's contacts, and deletion is cancellable during the grace period. Do not fast-forward or trigger purge on real accounts. |
| Secret/static exposure | Check agreed staging for accidental environment/backup/source-map publication; inspect the preview response headers. | No environment files, private keys, retirement backups or auth secrets are published. SPA HTML returned for an unknown path is not by itself proof of a file disclosure. |
| Framing/headers | Check CSP, framing restrictions, MIME policy and HTTPS HSTS on the final hosted URL. | No script unsafe-inline/unsafe-eval wildcard permission; object-src none, frame-ancestors none, nosniff and the expected headers. External framing must fail. |

Identity uploads/manual DOB comparison reduce risk but do not guarantee an authentic ID or live person. Issuer checks and liveness are not implemented and must not be claimed in a tester report.

## How to report a finding

Record one finding per issue using [the report template](security-test-report-template.md). Include a synthetic account label, exact test URL, browser/device, reproducible steps, expected/actual behavior, severity and redacted request/response evidence. Do not paste cookies, JWTs, passwords, OTPs, authenticator seeds, API keys, real IDs or private screenshots into shared reports. Stop that test and report promptly if it reveals another person's real records.

A tester needs the URL and their test credentials only—not your `.env`, Git-ignored archive, Convex deploy key or database dump. Review the report together, fix confirmed issues and retest the exact steps before release.

## Evidence from this implementation round

- Automated security command covers backend authorization/age checks, cookie persistence/revocation/expiry, UI/session recovery, configuration consistency, private public-directory surfaces and production build.
- A loopback homepage request confirmed the preview's actual security headers.
- A harmless fake `.env` probe was denied with HTTP 403 by the dev server and removed immediately; no actual secret file was requested.
- No live scan, payment, email request, owner MFA enrollment or real-user penetration test was performed. HTTPS/browser/manual findings are still to be collected on the agreed isolated test site.

Reference: [OWASP Web Security Testing Guide](https://owasp.org/projects/web-security-testing-guide). Cookie/security behavior here is specific to Mlezi; a generic scanner's cookie finding must be checked against the actual preference-cookie versus sessionStorage design.
