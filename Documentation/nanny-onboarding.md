# Nanny and babysitter signup

Implemented locally on 17 November 2026. Deploy the Convex schema/functions and matching frontend together; no production deployment was performed.

## User flow

1. Create account: the unchecked 18+ declaration, Terms agreement and Privacy acknowledgement are on the first create-account screen. Password/email signup and Google signup are blocked in the UI until accepted. Google signup also captures name, phone and role before leaving the site.
2. After email/Google verification, the matching signup draft is used to register the marketplace account automatically. The ordinary flow no longer repeats the role/name/phone/terms screen. The backend requires explicit adult confirmation and current terms acceptance for new accounts and timestamps the declaration. An age declaration is not proof of age; manual identity/adult-age verification is unchanged.
3. Work details: prefilled name, area/town, experience, nanny/babysitter category and work arrangement. Introduction, pay expectations, skills and languages can be added later. The details can be saved without a profile photo or identity files.
4. Identity: explain all three photos first, obtain identity-processing consent, then upload each photo independently with preparation/upload progress and a private saved status. Successful uploads survive navigation/reload; a failed upload does not discard the other files. Final submission requires all three stored photos and fresh identity consent.

The progress indicator counts account creation, work details and identity as the three steps. After submission the normal profile is created with pending identity status. Neither submitting files nor paying a membership grants adult/identity approval.

## Recovery and compatibility

- Missing, expired or unavailable browser signup drafts still require initial account details/consent. Previously supplied consent is never invented to skip a necessary recovery step.
- Email drafts remain bound to the verified email. Google pending drafts can be resumed only from the originating tab; unbound cross-tab Google drafts are not trusted.
- Existing accounts retain their roles, login methods and profile-edit flow. Legacy accounts are not assigned a fabricated age declaration. Existing profiles missing evidence continue through their repair form.
- The first agreement has inline Terms/Privacy links and a compact checkbox layout. Optional cookie preferences remain separate.

## Draft security and retention

`onboardingDrafts` stores the authenticated account's validated work fields and private storage references. Draft data is not inserted into searchable profiles. No public image URL is returned. Upload purpose, ownership, freshness, consent and stored-file presence are checked server-side.

Drafts expire seven days after the latest explicit work save or successful upload. Expiry removes their private files and upload records. Scheduled expiry jobs ignore drafts already submitted; final submission adopts the images before deleting the draft record. Replacing an image deletes its previous draft file. The existing one-hour cleanup still applies to uploads that never attach to a draft.

Privacy export includes the unfinished work, consent/expiry information and uploaded-file booleans without private file identifiers. Account deletion erases the draft and its files. Daily retention also schedules cleanup of overdue drafts. Submitted evidence uses the existing review-retention schedule.

No password, login code or identity image is stored in browser signup drafts. The phone/name/role draft includes declaration flags and the terms version and expires after 30 minutes.

## Deployment and verification

Deploy new schema fields/table, `onboarding` functions, profile-setup helper, privacy/retention changes and frontend together. New marketplace registrations require the `adultConfirmed` argument; an older frontend will need the new bundle. Regenerate Convex's generated API types as part of the normal deployment workflow.

Automated validation passed: 163 UI tests, 145 backend tests, lint, production build, and consent/security-configuration/SEO/route checks. Coverage includes automatic post-verification registration, Google/email draft recovery, first-screen declaration, per-file progress, ownership, incomplete submission, replacement, seven-day expiry, preservation of submitted images, and account deletion.

Physical Android/slow-network testing remains to be done after deployment. Verify Google/password/email-code/magic-link signup, leaving and returning at each step, individual upload retries, terms links and sign-out on the actual release.
