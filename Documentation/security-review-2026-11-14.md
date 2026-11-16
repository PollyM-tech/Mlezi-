# Mlezi security review — 14 November 2026

Scope: local frontend and Convex source, existing automated tests, and provider documentation. This is not a penetration test, live infrastructure attestation, or legal certification. Changes are local and require backend/frontend deployment.

## Implemented in this change

- Profile name or primary photo edits revoke pending/approved identity status and adult confirmation. Pending submissions become rejected; administrator approval compares the submitted name and photo snapshot against the current profile. Re-verification requires fresh consent and selfie, plus a fresh ID if prior evidence was erased.
- All marketplace responses returning caregiver phone/email now require a currently active employer pass, including previously unlocked contacts. Expired contact lists return no contact records. New unlocks are capped at 30 per account per day, in addition to the existing write limit. This changes the previous lifetime-contact-access policy; review the updated customer terms before rollout.
- Raw Convex ID images are erased by the daily retention job 30 days after the latest review decision or after a pending request expires. Reviewed selfies were already scheduled for deletion. A receipt preserves approved identity/adult status without requiring an ID image forever. Name/photo edits invalidate that status. Legacy assets are explicitly excluded pending migration; backups have separate retention requirements.
- Identity uploads require an explicit consent header before accepting evidence. New verification submissions record consent time. These are assertions of consent, not proof of a person's informed choice; the frontend checkbox and notice remain essential.
- Private document reads recheck administrator MFA before logging/delivery and have a 30-per-minute administrator limit. Documents are delivered through authenticated, no-store HTTP actions, not public file URLs. The administrator UI revokes its blob URLs after 60 seconds. This is not a presigned URL implementation, and cannot prevent an authorized reviewer from saving displayed bytes.
- Public-text filters additionally reject seven/eight-digit identity-number patterns. Existing filtering covers Kenyan phone formats, emails, URLs and common obfuscations. Regex filtering is not complete DLP and needs moderation for evasion and false positives.
- Explicit HTTPS custom HTTP-action domains are accepted by frontend file requests and M-Pesa settings. Automatic derivation still applies only to standard Convex cloud URLs.
- Payment instructions distinguish automated STK confirmation from administrator-reviewed manual payments.
- A responsive testimonial component has three nanny and three employer content slots in `frontend/src/content/testimonials.js`. It renders only entries with name, quote and approval date. No customer statements have been invented.

## Existing controls confirmed in source

- Convex Password provider uses Lucia Scrypt hashing; no custom plaintext credential store was found in this authentication path. Preserve provider hashing, salted verification and recovery rather than hashing in browser code.
- Email verification, failed-sign-in limits, 15-minute JWTs, session expiration checks, safe redirect origins, disabled dangerous OAuth email linking, administrator TOTP and time-limited admin grants.
- Private ID/selfie storage identifiers are excluded from public projections. Ownership and upload purpose are checked before assets can be claimed. Uploads have size/type checks, image decoding/re-encoding, and orphan cleanup.
- Signed-out visitors cannot read caregiver listings/details/reviews. Backend role/ownership checks protect profile edits, paid unlocks, account administration and privacy requests.
- M-Pesa callbacks are untrusted hints only. Claimed callback result codes, amounts and receipts cannot activate membership. Reconciliation queries Safaricom using server credentials and the stored checkout ID; settlement only operates on pending records, preventing repeated activation. Existing payment tests exercise forgery/replay cases.
- Account export, correction/deletion requests, deletion grace period, a scheduled purge, and administrator request handling exist.
- Administrator document access, identity decisions and manual payment decisions have application audit records. They are not immutable against a privileged deployment operator. Current audit retention is 90 days.

## Configure OAuth branding and custom domain

The public Convex hostname is an endpoint, not a password or API secret. Hiding or renaming it does not replace authentication or authorization. A branded hostname helps recognition and reduces confusion.

1. In the production Convex deployment settings add an HTTP Actions custom domain, for example `auth.mlezicare.com`. Confirm ownership and the exact DNS records supplied by Convex, then wait for domain/TLS verification. Current Convex documentation requires a Pro plan. Do not change environment values before the domain works.
2. In Convex Deployment Settings → Override Environment Variables, set `CONVEX_SITE_URL` to the verified HTTPS HTTP-action origin. This also changes Convex Auth redirect URLs and JWT issuer. Coordinate rollout and verify authentication/JWKS; existing sessions may need sign-in again. Leave the Convex API/cloud origin unchanged unless separately migrating it. The installed library also supports `CUSTOM_AUTH_SITE_URL`; remove a stale override or align it to the verified domain.
3. In Google Auth Platform → Branding set the real application name (Mlezi), approved logo, support email, home page, privacy notice and terms. Add/verify `mlezicare.com` using the required Google ownership process and submit for brand verification as required. Branding may remain domain-based until Google approves it.
4. Add the exact OAuth redirect URI `https://auth.mlezicare.com/api/auth/callback/google` to the existing Google Web OAuth client. The installed `@convex-dev/auth` source constructs this callback path through Auth.js: confirm the actual authorization request's redirect URI against the deployed library before saving. Do not substitute callback routes from newer Convex authentication packages.
5. Set frontend `VITE_CONVEX_SITE_URL` to the verified origin and rebuild. Keep `SITE_URL` pointing to the frontend origin, and maintain exact trusted frontend origins in `APP_ALLOWED_ORIGINS`.
6. Add the exact custom HTTP origin to CSP `connect-src` in the hosting configuration (`frontend/public/_headers` for hosts honoring this file). Do not loosen to all HTTPS origins. If also migrating the API/cloud domain, update `connect-src` HTTPS/WebSocket and `img-src` origins accordingly.
7. Test Google signup/sign-in, existing password/Google accounts, sign-out, password recovery, ID uploads, administrator MFA/document reads and an actual M-Pesa callback/reconciliation. New STK requests use the updated callback origin. Keep old routes reachable while pending callbacks/integrations migrate.
8. Update production/build configuration and mobile clients as applicable. Do not disable default Convex domains until every dependent client/integration has migrated. Default-domain disabling requires Convex support.

Do not paste Google client secrets, Convex deployment credentials, National IDs or M-Pesa passkeys into source, tickets or test output.

## Remaining work, ordered by priority

| Priority | Finding / required work | Acceptance evidence |
| --- | --- | --- |
| High | Verify storage encryption, project administrator access, processor agreements, backups and retention in the actual deployment. Migrate/delete legacy Cloudinary identity evidence; code cannot establish its historical public access policy. | Operator access review; private evidence cannot be retrieved anonymously; deletion also covered by documented backup expiry. |
| High | Directory reads are Convex queries and currently lack a persistent per-user read budget. New-unlock limits protect contacts but do not prevent signed-in profile scraping. Implement backend-controlled read budgets/pagination or a gateway that cannot be bypassed via default Convex endpoints. | Direct API tests exceed a per-user directory/detail/review budget and receive rejection; restrictive query pagination and account abuse monitoring. |
| High | Callback source IP filtering is not implemented. Do not trust arbitrary forwarded headers or guessed Safaricom IP lists. Obtain current approved ranges from Safaricom and enforce at an ingress with authenticated connection metadata, covering all alternate routes. Preserve server-to-server status verification even after filtering. | Spoofed source headers and direct default-domain requests cannot bypass filtering; callbacks alone never activate access. |
| High | Audit records are mutable by privileged operators and erased after 90 days. Add a separately controlled append-only/WORM log sink, minimal PII, retention policy, monitoring and review for document access, decisions and pass overrides. | Restore/tamper tests, export/delivery monitoring, operator separation and documented log retention. |
| High | Complete ODPC registration assessment, lawful bases, transfer safeguards, processor contracts, retention approval, breach response and a DPIA assessment for ID/selfie processing. Existing export excludes identity files and some records: complete DSAR access via a secure supplemental workflow, track deadlines and test fulfillment. | Qualified local review; registration where applicable; tested access/correction/deletion requests and incident procedure. Do not represent the app as fully compliant based on checkboxes alone. |
| Medium | Automated OCR/face matching is not integrated. Select provider, Kenyan-ID support, accuracy/age rules, liveness needs, processor terms, regions and deletion guarantees. Facial comparison may introduce biometric processing. Use only as triage with manual decision/review; never auto-grant the badge from an unvalidated score. | Consent/notice and DPIA review, evaluation dataset with false-match results, restricted credentials and failure fallback. |
| Medium | Verify real deployed CSP/security headers, dependency advisories, secret hygiene, monitoring and backup restoration. Repository checks do not prove the hosting provider applies `_headers`. | Live header checks, dependency scan, restore drill and alert tests. |
| Medium | Legacy grants/hire workflows can retain a contact-unlock record after expiry; they no longer expose caregiver contact data through marketplace responses. Review commercial policy, already downloaded contacts, and customer communication before changing existing paid terms. | Owner-approved rollout and end-to-end pass expiry/renewal checks. |

## Testimonials still required

Provide three real nanny quotes and three real employer quotes, approved display names and permission to publish. Record the approval date in the content file and keep evidence of permission privately. Photos are optional and need separate consent. Do not publish fictional quotes, stock-photo identities or sample ratings as genuine customer feedback.

## Provider references

- Convex custom domains and auth issuer effects: https://docs.convex.dev/production/custom-domains
- Google OAuth branding: https://support.google.com/cloud/answer/15549049
- Google brand verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- ODPC registration guidance: https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-on-Registration-of-Data-Controllers-and-Data-Processors.pdf
- Data subject rights: https://odpc.go.ke/rights-of-a-data-subject/

## Validation results

- Backend: 139 tests passed, including consent-before-upload, ID evidence retention/re-upload, identity change invalidation, pass expiry and daily unlock budget cases.
- Authentication/UI: 150 tests passed. Two stale homepage-heading expectations were updated to match the existing homepage copy.
- ESLint, Vite build/public prerender, consent/search/security-configuration/SEO checks and `git diff --check` passed.
- Live website retrieval through the web tool was unavailable. No authenticated production journey, provider console, storage ACL/encryption configuration or deployed headers were inspected. No production deployment, DNS change, Google console update or OCR provider integration was performed.
