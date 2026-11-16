# Launch feedback: decisions and remaining work

14 November 2026. These are local changes, not evidence of a deployed release or certification.

## Addressed locally

- Removed all sponsor/partner presentation and navigation. No endorsement or affiliation is claimed.
- Removed the public “Pre-launch draft” banner. Service branding is Mlezi and structure is sole proprietorship, as supplied by the owner. Lintech branding and legacy registration number are not used for these notices. This does not assert that Mlezi is a registered company or that its notices received legal approval.
- The legal configuration now requests the actual proprietor identity (`VITE_LEGAL_PROPRIETOR`) and public service address (`VITE_LEGAL_SERVICE_ADDRESS`). Missing details are not replaced with invented ones. Production checks continue to flag missing details and review.
- ID retention was fixed in the preceding local changes: private Convex IDs are scheduled for erasure after 30 days, with the result/reviewer/date retained. Reviewed selfies are also deleted; current public profile photos remain necessary for the profile. No text field stores the extracted national ID number. Legacy-provider evidence and backup expiry still need operator work.
- Safe hiring checklist: `/safe-hiring/`. It covers interviews, permission to contact references, paid supervised trial days/weeks, home rules, right to work and reports. Child-safety contact is sourced to Kenya Children Services; it is not a Mlezi support promise.
- Report a profile is visible on employer discovery/shortlist cards and leads to the profile safety form. Profile pages link to the checklist.
- Identity FAQ is two short sentences and links to `/identity-checks/`; the detailed explanation stays there. Browsing copy specifies a free employer account. Payment prices/instructions remain hidden from public marketing while paid plans are coming soon.
- Added six city guides: `/kenya/nairobi/`, `/kenya/mombasa/`, `/kenya/kisumu/`, `/kenya/nakuru/`, `/kenya/kiambu/`, `/kenya/eldoret/`. Expanded the Kenya guide. These do not claim local offices, verified stock, pilot families or guaranteed availability.
- Existing Organization/WebSite structured data is preserved. Homepage FAQPage data matches the visible FAQ. Sitemap/robots generation includes public guides and excludes private accounts. FAQ data does not guarantee Google rich results; Google restricts FAQ rich results chiefly to authoritative government/health sites.
- Regional pages explicitly say the launch focuses on hiring in Kenya, no cross-border placement/immigration service is offered, and families/caregivers must confirm required permission before work. This is a scope statement, not a backend nationality ban.
- Nav/footer section controls are real fragment anchors and work without JavaScript in prerendered HTML. Mobile navigation closes when clicked.
- The hero renders its initial image once. Browser-reported slow connections/data saving/reduced motion disable its rotation and prefetch. Below-fold images were already lazy-loaded, and marketing assets were already compressed WebP; filenames and source references now use kebab-case. The caregiver section uses a different photo. Reusing one URL elsewhere normally benefits from browser caching and does not by itself prove a second network download.

## Before calling the release ready

1. **Operator details:** provide the actual sole proprietor name and a public business/service address. A service name alone does not establish the responsible legal person. Set these in deployment configuration; review data-controller identity, notices and registration requirements with qualified local advice. Do not mark `VITE_LEGAL_REVIEWED=true` just to hide a banner.
2. **Deploy and verify the earlier security changes:** backend, schema, scheduled retention and frontend must all be deployed. Verify a retention dry run in a non-production fixture, then deletion in the selected deployment, and confirm backup/legacy evidence retention. Source edits do not delete production documents by themselves.
3. **Payments and OAuth:** retain Coming soon marketing until checkout is tested. Complete custom-domain/Google branding setup and live payment verification described in the security review. Do not reintroduce KES purchase instructions while checkout is unavailable.
4. **Indexing:** the checked build still reports indexing disabled. For the real production host configure `VITE_APP_ORIGIN=https://mlezicare.com` and `VITE_SITE_INDEXABLE=true`, then rebuild. Preview/development builds must remain noindex. Verify live `/robots.txt`, `/sitemap.xml`, canonicals and Search Console; local generation does not confirm what a host serves.
5. **Real device upload QA:** test the complete signup/ID/selfie flow on a mid-range Android with a throttled 3G connection, then on a real mobile network. Check camera JPEGs, rotation, large files, interrupted uploads, retry without duplicate submissions, consent, expired sign-in, admin display and memory use. Existing client compression is not proof that this journey works on that phone. No physical Android test has been performed here.

## Good Conduct and references: build a real review process first

Do not add a “background checked” badge for a file upload. A sensible next milestone is optional, private supporting evidence with consent, reviewer/date/expiry, a clear scope and a way to revoke the signal after a relevant identity change.

- Define the official certificate checking process and the authorised reviewer. Separate “document submitted” from “document reviewed” and “issuer-confirmed”. Never imply that a certificate guarantees safety.
- Use the private evidence pipeline, administrator MFA, no-store delivery, access auditing, short retention and deletion handling. Extend export/deletion and notices before accepting the extra data.
- For references, obtain the caregiver’s and referee’s permission, verify who was contacted and record only the minimum outcome/date. Keep private referee contact details out of public profiles and exports to unrelated users. Never upload information identifying a referee’s children.
- Decide staffing, turnaround, appeal/correction and expiry before displaying any badge. This workflow and its badges have **not** been implemented in this change.

## Credibility without invented testimonials

The owner has now supplied eight testimonials for publication: four caregivers and four employers. The content file includes those statements, lightly edited for clarity; no approval date, completed-hire status or aggregate rating has been invented. Keep the original feedback and publication permissions privately. Do not guess quotes, names, star ratings, pilot figures or biographies. A fake review about childcare can create false confidence in a caregiver or platform.

Start with a small real feedback round:

1. Ask three nannies: “What was clear or difficult about creating your profile? What would you tell another caregiver?”
2. Ask three employers: “How did browsing and comparing profiles help? What was missing?” Do not describe someone as having hired through Mlezi unless they actually did.
3. Ask permission to publish the exact short quote, preferred display name/initials and role. Photos need separate permission. Do not include children’s names or a family’s exact location.
4. Keep the permission record privately; put the approved quote/name into `frontend/src/content/testimonials.js`. Set `publish: true` to display it. Offer a way to withdraw permission.
5. Publish pilot counts only after defining and counting the real event (registered families, completed interviews or hires are different numbers). A truthful purpose statement and clear support route are enough while collecting feedback.

## Remaining design/localisation work

- Request the original vector logo from the designer. No authentic full vector logo was supplied; wrapping a PNG in SVG does not make it a vector or reduce its size. Keep the existing brand until a real SVG is provided.
- Prioritise reviewed Kiswahili signup, consent, safety guidance, upload errors and support text. Establish a maintained translation workflow before claiming full Swahili support.
- WhatsApp support needs an actual dedicated business number, operating hours, staffing and privacy rules. Do not invent a number or ask people to send IDs, passwords, children’s records or M-Pesa PINs there. Private tickets remain the available route.
- Confirm the proprietor/founder story before writing personal history. Use the actual reason the service was built and current capabilities, without invented achievements.

## Primary references

- Child Helpline: https://www.childrenservices.go.ke/child-helpline-116
- Work permits: https://immigration.go.ke/work-permits-and-passes/
- FAQ search appearance limits: https://developers.google.com/search/blog/2023/08/howto-faq-changes

## Verification

151 authentication/UI tests, the SEO suite, lint and production build passed. The build prerendered 18 public pages and still reported indexing disabled. `git diff --check` passed. Browser mobile-layout checks could not complete in this environment: the sandbox blocked the preview port and the elevated attempts did not finish, so they were stopped. No physical Android/3G upload journey has been completed. Production deployment, public operator configuration and live indexing/header checks remain outstanding.

## Owner status update

The owner reports that OAuth/custom-domain and payment setup were already completed. Treat those as owner-reported completed setup, pending verification after deployment; the code review did not establish that they were missing. Provider settings and payment credentials were not changed. Local changes affect custom HTTP-origin validation, checkout visibility/copy, contact expiry enforcement and the documented security controls. The owner plans the real Android/slow-network upload test after deployment.

## Payment copy update — 16 November 2026

The owner confirmed M-Pesa STK Push is working. Removed all Coming soon payment messaging from public pages, account screens and legal content. Public prices and Membership links are restored. Account checkout still uses backend availability, with a temporary-unavailability message only when that backend reports checkout unavailable. This copy update does not alter payment processing or provider configuration.
