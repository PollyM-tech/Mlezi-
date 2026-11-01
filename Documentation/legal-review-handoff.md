# Mlezi legal review and operator decisions

Prepared 1 November 2026. **Status: service/code alignment reviewed; independent
legal review, operator particulars and final publication approval remain pending.**
Do not set `LEGAL_REVIEW_COMPLETE=true` on the strength of this document alone.

## Confirmed by the owner

- Exact legal name confirmed by the owner: **Lintech Telecom**. Business structure,
  registration number (if applicable), ODPC status and service address remain unconfirmed.
- Version 1 is a nanny/caregiver **marketplace for listings and introductions**.
  It does not recruit/place workers, employ caregivers, manage their employment
  or collect caregiver wages. Families hire and pay caregivers directly.
- Initial hiring focus: Kenya, with regional caregiver discovery content for
  Uganda, Burundi and Rwanda. No overseas-placement promise or local offices.
- Premium is paid visibility, not identity approval. Fees planned: employer
  KES 300/30 days or KES 500/90 days; caregiver Premium KES 500/365 days.
- Renewals are manual, early renewals extend remaining time, and ordinary pass
  expiry preserves unlocked contacts subject to safety/deletion restrictions.
- Payments remain disabled. Paystack is the chosen planned gateway; its contracts,
  live configuration and refund/cancellation policy have not been finalized.
- Public personal contact details are not desired. Support uses tickets/private
  email follow-up with a 48-hour commitment. Domain confirmed by owner: mlezicare.com. Business email and hosting setup remain pending.

## Review copies and public implementation

- [Privacy notice](legal/privacy.md)
- [Terms of use](legal/terms.md)
- [Cookie policy](legal/cookies.md)

These copies export the same content used at `/privacy/`, `/terms/` and `/cookies/`.
Run `npm run legal:export` from `frontend` after edits. The source is
`frontend/src/lib/legal-content.js`; the version is in
`frontend/convex/lib/legalPolicy.js`. This prevents a separate Word/Markdown draft
silently diverging from the public pages.

The pages visibly remain pre-launch drafts. Merely adding the operator name no
longer hides that status. `VITE_LEGAL_REVIEWED=true` has effect only with the actual
operator name, business structure and service address. It is an attestation, not
automated legal verification. The text itself must be finalized too: remove or
resolve pending-basis, provider/transfer, backup and payment language as applicable
to the reviewed release, and increment the version for material changes.

## What the legal reviewer needs to assess

| Area | Current facts and requested decision |
| --- | --- |
| Actual contracting operator | The owner confirms the exact legal name as Lintech Telecom. Confirm entity type, any applicable registration, public business/service address, capacity to contract and a usable privacy/contact route. Do not substitute a sponsor logo for an operator identity. |
| Controller and ODPC registration | Establish who determines processing purposes and whether registration/exemptions apply to the actual activities, scale and categories. Record the assessment and any required registration. Do not assume that being small or calling the product a marketplace settles this. |
| Mandatory ID/selfie processing | Examine necessity, proportionality, appropriate lawful grounds, meaningful withdrawal/request handling and less intrusive alternatives. The app compares images manually; it does not extract automated facial templates or perform liveness. Do not classify every photo as biometric data without assessing the actual processing. |
| ID retention | Current code retains the current ID while the account remains and deletes reviewed selfies/obsolete evidence after 30 days. Approve or shorten that lifecycle with matching code before launch. An ID image can contain DOB/number even though the entered DOB is not retained as a separate field. No existing ID was deleted as part of this drafting task. |
| DPIA/risk assessment | Screen the identity evidence, vulnerable worker/child-care context, publication and review consequences; complete any required impact assessment and resulting measures before production. A manual check is not proof that an assessment is unnecessary. |
| Provider/transfer arrangements | Confirm actual Convex, Resend, hosting, Cloudflare and Google services; review processor/subprocessor contracts, locations, safeguards, disclosures and rights handling. The current Convex endpoint region is not proof of where every provider processes every category. Do not imply blanket transfer consent. |
| Retention outside the live app | Approve a schedule for encrypted backups, restore copies, provider logs, former Flask/SQLite and Cloudinary rollback copies; document access, expiry and preventing restoration of deleted data into active use. No disposal period has been invented or old archive deleted. |
| Rights and incident procedures | Confirm applicable request deadlines, identity checks, exemptions/reasons and escalation. Support's 48-hour commitment is separate from statutory rights deadlines. Allocate incident assessment/notification responsibility. |
| Marketplace/employment boundary | Check the actual activities rather than the product label. Confirm duties and required registrations/licences for the current model, including worker protections, future placement and cross-border work. The code does not currently recruit/manage employment; no conclusion that every marketplace is automatically exempt is made. |
| Reviews, ranking and moderation | Assess truthful review attribution, defamation/privacy handling, fair review/appeal routes, paid ranking disclosure and consumer information. An unlock does not prove employment; Premium cannot buy ratings or verification. |
| Terms formation | Confirm the new-account click acceptance/records and treatment of existing imported accounts. Consider when existing users need notice/re-acceptance, especially when final text or paid services materially change. No historical agreement has been fabricated. |
| Payments, before activation | Review provider/merchant identity, total cost/tax presentation, manual renewal, activation after trusted confirmation, cancellation/refunds, duplicate/failed payments, receipts, complaints/chargebacks and statutory rights. Never infer consent to recurring charging or impose an unreviewed blanket no-refunds rule. |

These are review questions based on the service, not a certificate that an obligation
applies or has been discharged. A Kenyan advocate with data-protection, employment
marketplace and consumer-contract experience should review the completed business
facts and documents. Wider-country operations need a separate jurisdiction review.

## Code changes accompanying the documents

- Versioned, navigable, responsive public notices identifying Lintech Telecom as the supplied
  operator name, with clearly pending legal particulars and public ticket contact.
- Privacy covers actual public/private records, manual review limitations, retention,
  support emails, ranking, providers, rights and ODPC complaint link.
- Terms reflect marketplace-only scope and preserve non-excludable rights rather
  than imposing arbitrary liability caps, compulsory arbitration or no-refund terms.
- New account completion requires an unchecked acknowledgement: age 18+, agreement
  to terms and acknowledgement of privacy; optional cookies remain separate.
- The server rejects absent/stale acceptance for a newly created account and stores
  the actual timestamp/terms version/privacy version. Imported/existing accounts
  retain their roles and are not backfilled with invented agreement. Acceptance
  records appear in the owner's export and are removed with personal account purge.
- Identity forms and guest support give nearby privacy links. Links on the final
  onboarding/upload forms open separately so entered details/uploads are preserved.
- Production checks require reviewed particulars and retain all other launch checks;
  no review flag was changed to true and no public deployment was performed.

## Information still needed from the owner

1. Lintech Telecom's business structure, registration number if applicable,
   and a business/service address suitable for legal notices (not an ID number or
   a private home address).
2. Domain mlezicare.com is confirmed. Business support sender/inbox, domain verification, DNS and actual hosting remain pending.
3. Approved live-ID and backup/archive retention decisions, provider contracts and
   a recorded qualified review outcome for the exact final document version.
4. Payment/refund/consumer decisions when payment integration is undertaken next.

Populate `VITE_LEGAL_ENTITY`, `VITE_LEGAL_STRUCTURE`,
`VITE_LEGAL_SERVICE_ADDRESS` and, if applicable,
`VITE_LEGAL_REGISTRATION_NUMBER`. Leave `VITE_LEGAL_REVIEWED=false` and
`LEGAL_REVIEW_COMPLETE=false` until the corresponding work is actually done.

## Primary references consulted

- [ODPC: data subject rights and principles](https://www.odpc.go.ke/rights-of-a-data-subject/): information, access, objection, correction/deletion and transparency/safeguards.
- [ODPC: complaint route](https://www.odpc.go.ke/file-a-complaint/): independent escalation for data subjects.
- [ODPC: registration guidance](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-on-Registration-of-Data-Controllers-and-Data-Processors.pdf): registration assessment, not a conclusion of exemption/registration for Lintech Telecom.
- [ODPC: DPIA guidance](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-on-Data-Protection-Impact-Assessment-1.pdf): screening actual privacy risks and consequences.
- [ODPC: biometric-data guidance](https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-%E2%80%93-Guidance-Note-on-Biometric-Data.pdf): classify actual processing before choosing requirements.
- [Kenya Law: Consumer Protection Act](https://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/ConsumerProtectionActNo46of2012.PDF): reviewer to assess internet-agreement disclosure, acceptance/copy and cancellation obligations before paid checkout.
- [NEA official portal](https://www.neaims.go.ke/): employment-agency registration/verification context for any actual future placement activity.

Some ODPC PDF endpoints and Kenya Law's Act page could not be directly opened during
this session; primary indexed extracts were available for the cited guidance.
The legal reviewer must use the current official instruments and confirm amendments;
this handoff does not claim a complete statutory or case-law review.
