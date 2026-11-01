# Mobile implementation — 1 November 2026

Mlezi now has a separate React Native/JavaScript application under `mobile`, using Expo SDK 57 and Expo Router. The public website stays in `frontend` with its existing Vercel configuration. Convex remains the only backend.

## Authentication and access

The native app uses Convex Auth with Expo SecureStore for persistent credentials. Authenticated file uploads use the same protected Convex HTTP endpoint and purpose/ownership checks as the website. The device prepares JPEG images; the server independently validates, sanitizes and stores them. ID/selfie images are never rendered as public assets. Selected picker images and generated account exports are cleared from cache when no longer needed.

New caregivers need a profile photo, ID, selfie and explicit comparison consent. Photo setup, restricted accounts, deletion grace and administrator MFA have separate navigation guards. Public profiles, search, reviews, unlocked contacts and account actions still use backend permissions; hiding a button does not grant access. Account-scoped reads discard late responses after a route/account change.

The shared auth redirect policy now accepts one additional exact destination, `mlezicare://auth`, for installed builds. Other schemes, hosts, paths and query/fragment-bearing destinations remain rejected. The app validates inbound links before passing an email code to Convex Auth. Codes and credentials are never logged. Email-code/password flows work in Expo Go; app-specific magic links require an installed build. Website same-origin redirect rules remain enforced.

## Product coverage

Caregivers can create/edit profiles, set work arrangements including travel, upload identity evidence, request identity review, view public ratings and reply to reviews. Employers can search/filter, shortlist, view saved contacts, unlock new contacts when an existing pass permits it, and publish/update reviews. Ratings and membership access use existing server rules. Payments remain disabled; no payment provider or credentials are added.

Signed-in support, private conversations, local FAQ help, legal notices, privacy export/requests and deletion/cancellation are available. Administrator support retains MFA. Full identity approval/moderation remains on the website. Guest support opens the existing protected website form and depends on public hosting, Turnstile and verified email configuration. It does not bypass those protections.

Shared categories, FAQ answers and legal text are imported directly from existing pure JavaScript files, avoiding separate policy copies. Legal drafts still show their review warning. Native SecureStore is necessary authentication storage; the website’s optional font/search-cookie choices do not add a mobile analytics or advertising SDK.

## Completed automated validation

Mobile lint and JavaScript type checking passed; four focused mobile tests passed; Android and iOS Hermes exports completed; Expo Doctor passed all 21 checks. The shared backend suite passed all 51 tests, including strict mobile redirect cases, and frontend lint passed. The tested redirect update was synced to the existing development Convex deployment. These checks did not send authentication emails, change payment settings or deploy a production release.

## Device acceptance checklist — still required

Use development accounts and non-sensitive sample files. Never publish real ID evidence in screenshots, issue reports or commits.

1. On an actual Android phone and iPhone, launch from Expo Go, browse signed out, change filters, open a profile and use the back button. Check small-screen keyboard/scrolling, readable text, the Mlezi logo and image loading.
2. Create each role using an email permitted by the current sender configuration. Request codes yourself. Verify password sign-in, incorrect credentials, expired/wrong codes, resend limits, forgot-password flow, sign-out, relaunch and session expiry. Confirm there is no redirect loop.
3. As a caregiver, confirm missing-photo setup prevents normal workspace use while Support/Privacy remain reachable. Cancel photo/camera permission and recover. Submit profile/ID/selfie with consent; inspect the profile status on the website. Confirm “Other” needs a description, travel scope is saved and changing the photo/name resets approval.
4. Perform administrator identity comparison and adult-age review on the website. Confirm only eligible published profiles appear in mobile discovery. Premium never grants identity approval.
5. As an employer, test all filters, shortlist add/remove, pagination and review eligibility. With a legitimately provisioned development pass, unlock a contact and confirm it remains after ordinary pass expiry. Confirm no checkout can charge you.
6. Publish/edit a sample review, reply as its caregiver and report it. Verify both website/mobile display the same data and recalculated rating. Verify another employer cannot edit that review.
7. Open a signed-in ticket, reply from the administrator after MFA and view the conversation from the customer account. Verify another customer cannot open it. Do not expect guest-email delivery until the domain/sender/inbox/Turnstile configuration is complete.
8. Export a development account summary, cancel the share sheet and confirm normal navigation. Test correction requests and deletion/cancellation on disposable accounts only. Inspect pending deletion state on the website.
9. Switch accounts, sign out and press Back: previous contacts, support messages and exports must not reappear. Background/foreground the app across MFA expiry; verify step-up is required again.
10. Disconnect/reconnect internet during sign-in, reads and uploads. Check retry/error handling and avoid duplicate submissions. Use an installed build to test magic links from a closed/backgrounded app, invalid links and replayed/expired codes.

## Release boundaries and dependency review

No signed app, cloud build, store submission or physical-device test has been completed by this implementation. Configure the operator’s Expo/EAS project, finalize bundle identifiers/signing, review store privacy declarations and permission descriptions, and finish the existing website/backend production checklist before a public release. The `com.mlezicare.app` identifier is a proposed application ID; availability/ownership must be confirmed.

The new app’s audit identified a critical advisory in the originally selected Auth.js patch. `@auth/core` was updated to 0.41.3 in mobile and its minimum patch aligned in the backend. Expo SDK 57 still has transitive advisories affecting its CLI/config tooling and URL-decoding dependency, including high-severity findings. They are a release blocker pending upstream-compatible upgrades/review, not a reason to force-install incompatible SDK versions. In particular, replacing the older CommonJS URL decoder with its ESM-only patch without adapting its caller can break Router; no such untested override was added. `deepmerge` currently has no published patch. Re-run `npm audit` before signed distribution and reassess against a supported patched Expo release.

References: [Expo SDK setup](https://docs.expo.dev/get-started/create-a-project/), [Auth.js advisory and patched version](https://github.com/advisories/GHSA-7rqj-j65f-68wh), [URL-decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
