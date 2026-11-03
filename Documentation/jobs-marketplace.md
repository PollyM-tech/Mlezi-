# Jobs, proposals and caregiver visibility

Implemented locally on 3 November 2026. Deploy the Convex functions/schema and frontend together before testing the live site. No cloud deployment or real payment was performed during implementation.

## Workflow

1. An authenticated employer opens `/jobs`, posts duties, category, work arrangements, general location and a KES pay range/period.
2. A caregiver submits a proposed pay amount, period and message. Complete profiles with an active pending identity submission may apply. Hidden profiles may deliberately apply; applying shares the profile with that employer.
3. The employer reviews proposals with **Identity verified** or **Identity unverified** badges and offers the job to one applicant at a time.
4. Only that caregiver can accept. Adult identity approval is required at acceptance. The employer needs an active contact-access pass unless this contact was previously unlocked. Acceptance atomically fills the job and shares contacts. Repeating acceptance cannot create a second hire or unlock.
5. Either side can withdraw its pending proposal/offer. Employers can pause, close or reopen unfilled jobs. A filled job cannot be reopened; post a new job instead.

Posting/reviewing jobs does not introduce a new platform charge. Wages are agreed directly; no escrow or wage transfer is implemented. In-app notifications link to new applications and offers; external job-notification emails/push are not implemented.

## Visibility and access

Marketplace visibility and accepting new work are separate controls in the caregiver workspace. Hiring changes neither. Hidden profiles do not appear in discovery or unlock to new browsing employers. Prior unlocked contacts remain accessible, subject to deletion and safety/identity restrictions. An application explicitly shares the profile with its job owner even when hidden. Private IDs and selfies are never included in applicant projections.

Job lists, applicants, decisions and notifications enforce account roles and ownership on the server. Administrators use their MFA-protected Jobs & applications section to review and pause/close listings; they cannot accept on behalf of an applicant. Job posting, applications and decisions have rate limits. Each job is limited to 100 distinct proposals; proposals are paginated. Jobs and the account’s own proposals are included in export/deletion handling.

## Manual acceptance checks

Use test accounts and approved test evidence; do not upload someone else’s ID without permission.

- Employer A posts a job. Employer B cannot read its proposals or decide them.
- Pending-review caregiver submits pay and a message. Employer sees the unverified badge; an offer cannot be accepted before adult identity approval.
- After administrator approval, accept the offer. Both parties see the confirmed hire and contacts. The job is filled and cannot take another winner.
- Expire the employer pass: new contact confirmation fails; a previously unlocked contact still permits acceptance.
- Withdraw an application or close the job; a stale offer cannot be accepted.
- Hide a caregiver profile, check it disappears from employer discovery, then apply deliberately. Only the job employer sees that shared application. Hiring does not change visibility or availability.
- Verify application/offer alerts use the correct account and disappear once acted on.
- Export and delete disposable accounts: own records export, proposals/jobs purge, and deletion prevents further hiring immediately.
- Check `/jobs` on a narrow phone and desktop, including posting, applicant profiles and offers. The route requires sign-in and is excluded from public indexing.

Privacy/terms drafts and FAQ include this functionality. Legal review status remains unchanged.
