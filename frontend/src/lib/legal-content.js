// Shared by the public notices and review-copy export; keep facts aligned with code.
export const LEGAL_CONTENT = {
  privacy: { title: 'Privacy notice', sections: [
    { id: 'scope', title: 'Who this notice covers', paragraphs: [
      'Lintech Telecom operates Mlezi, a marketplace for adult caregivers and employers/parents. The initial service connects families hiring in Kenya with caregivers, including people joining from Uganda, Burundi and Rwanda. Mlezi currently provides listings and introductions, rather than recruiting, placing, employing or supervising workers.',
      'Accounts are for people aged 18 or older. We do not offer children accounts. Describe care needs by general age group; do not publish children’s names, photos, school details, medical records or exact addresses. Report an underage account or inappropriate information through Support.',
    ] },
    { id: 'information', title: 'Information we collect and its sources', items: [
      'Account details: email, phone, account role and name where provided, with verification, credentials and session records needed for authentication.',
      'Caregiver profiles: photo, general location, experience, services, languages, skills, age groups cared for, availability, expected pay and bio supplied by the caregiver.',
      'Identity evidence: private national ID image and recent selfie, plus the profile photo, for manual identity and adult-age review. The ID image can contain more information than the fields used in a review.',
      'Manual payment reports: plan, expected amount, M-Pesa receipt reference, paying phone, status and administrator confirmation/rejection records. These are private account records, not public profile content.',
      'Marketplace records: shortlists, contact unlocks, membership dates, employer reviews, caregiver replies and reports. Reviews and reports can contain information supplied by another user.',
      'Support/privacy cases: issue details, messages, guest contact email and administrator decisions or restriction reasons.',
      'Technical information: authentication/session information, security events, provider connection/usage records and cookie choices. Optional search preferences stay in your browser tab.',
    ], paragraphs: ['Information comes directly from users, their marketplace interactions, administrators handling a case and the providers operating the service. Earlier Mlezi account records may be carried forward for continuity; account ownership still requires verification. Do not put ID numbers, passwords, private contact details or other people’s sensitive information in public fields.'] },
    { id: 'purposes', title: 'Purposes and intended processing grounds', paragraphs: [
      'We use information to provide and secure accounts, publish profiles, run search and contact access, review identity evidence, calculate ratings, moderate misuse, answer support and handle access/correction/deletion requests. Required fields are labelled. Without required account information, registration cannot be completed; without required caregiver evidence and approval, a caregiver cannot be published.',
      'The intended grounds are providing the service requested under the user agreement, proportionate legitimate interests in security and preventing misuse, consent where required for optional processing, and applicable legal obligations. The operator must confirm the appropriate grounds and necessity of mandatory ID/selfie processing before launch. Accepting terms or an upload permission does not waive privacy rights or authorize unrelated uses.',
      'Optional font loading and remembered search filters require your cookie choice. We do not currently use advertising trackers, sell personal information, or run automated face matching, facial templates or liveness verification.',
    ] },
    { id: 'identity', title: 'Identity and age review', paragraphs: [
      'An authorized administrator compares the ID, selfie and profile photo and checks that the ID birth date indicates an age of at least 18. The full birth date entered for that calculation is not saved in the review record; the result, reviewer and time are recorded. The retained ID image can still contain the birth date and ID number.',
      'Identity checked records this manual review. It is not an issuer-backed identity validation, criminal/background check, or guarantee of authenticity, suitability or conduct. Uploads, reviews and Premium do not grant this badge automatically. Identity/profile-photo changes can require a fresh review.',
      'Use Privacy and account or Support to withdraw a review request, question a decision or request evidence deletion. We will assess the request and explain effects on publication and any justified retention. A publicly listed caregiver must still have the required evidence and approval.',
    ] },
    { id: 'sharing', title: 'Who sees what', items: [
      'Visitors can see approved public caregiver profiles, profile photos, stated services/experience, availability, expected pay and public reviews/replies. Do not include private information in these fields.',
      'Employers with contact access can unlock a caregiver’s phone/email. Previously unlocked contacts remain accessible after ordinary pass expiry, subject to account deletion and identity/safety restrictions.',
      'Authorized administrators access private evidence and case information needed for review, moderation and support. Privileged access requires additional administrator verification.',
      'Service providers process information needed for hosting, database/storage, authentication, email and requested anti-spam or optional font features.',
    ], paragraphs: ['Shortlists and private identity/support records are not public profiles. Necessary disclosures for valid legal processes or serious safety/security concerns are assessed for lawful basis and scope. Deleting information here cannot always recall copies another person has already downloaded or shared.'] },
    { id: 'providers', title: 'Providers and international processing', items: [
      'Convex: authentication, database functions, file storage, sessions and operational records.',
      'Resend: account email and support acknowledgements/replies, including recipient address and email content.',
      'Website hosting: frontend delivery and connection information. Vercel is the planned host; the final deployment must be confirmed.',
      'Cloudflare Turnstile: browser/network information and challenge results when the visitor chooses to load the guest-support anti-spam check.',
      'Google Fonts: IP address and browser request information when optional font loading is accepted.',
    ], paragraphs: ['Providers and their subprocessors may process data outside Kenya. A European database location does not establish that every provider processes all information only there. Actual deployments, processor agreements, destinations and lawful transfer safeguards must be confirmed before launch; this notice remains a draft until that review is complete. Ask through Support for applicable arrangements. Website use is not blanket consent to international transfers.'] },
    { id: 'ranking', title: 'Search, paid visibility and decisions', paragraphs: [
      'Search applies the employer’s filters before showing labelled matching Premium profiles first, with rotating exposure. Other matching profiles follow. Keyword synonyms match stated information; they do not infer nationality, work eligibility or skills. Premium does not improve identity decisions or ratings.',
      'Ratings are calculated from public employer reviews. Unlocking a contact permits a review but does not prove hiring. Identity decisions and moderation have human review routes through Support. Mlezi does not automatically recruit or hire a caregiver on your behalf.',
    ] },
    { id: 'retention', title: 'Retention and deletion', items: [
      'Active accounts and profiles: retained while the account is active, subject to correction, deletion and justified obligations.',
      'Current ID image: retained for review while the caregiver account remains; necessity and duration require approval before launch.',
      'Reviewed selfies and obsolete identity evidence: scheduled for removal 30 days after the review decision. The current profile photo and ID remain separately.',
      'Pending identity requests: expire after 30 days; the expired selfie is removed and a fresh submission is needed.',
      'Unclaimed uploads: expire after approximately one hour. Security audit events: scheduled for removal after 90 days.',
      'Support conversations and associated email jobs: resolved tickets after 90 days without updates; other tickets after 180 days without activity. Account-linked tickets are also removed with account deletion.',
      'Cookie choice: up to 180 days. Optional search preferences and authentication storage are tab-based, subject to browser behavior; optional search preferences are cleared when optional use is declined.',
    ], paragraphs: [
      'Deletion is scheduled/batched, so removal can finish after a threshold rather than at its exact instant. An account-deletion request hides caregiver availability and restricts ordinary use immediately, followed by a seven-day cancellation period before personal records and associated files are purged. Limited pseudonymous audit/financial references may remain where justified.',
      'Cloud backups, provider logs and former migration/rollback copies need their own approved retention and secure-disposal schedule. That schedule is not yet finalized. Live-record deletion does not immediately erase every protected backup. Final backup limits, restore safeguards and payment-record retention must be documented before the relevant production use.',
    ] },
    { id: 'support', title: 'Support emails and guest requests', paragraphs: [
      'Guest support requires an email for acknowledgement and follow-up. It is private to authorized staff and email providers, unverified, and not proof of account ownership. Support acknowledgement and staff replies use Resend. Direct email replies go to the configured team inbox; they are not automatically imported into the app. Legacy guest tickets can still be accessible with a reference and secret access key.',
      'Do not send ID images, passwords, login codes or payment PINs through support. We target addressing support issues within 48 hours; statutory privacy-request deadlines remain separate. This is not an emergency service.',
    ] },
    { id: 'rights', title: 'Your rights and complaints', paragraphs: [
      'You can ask how your data is used, request access or correction, object to processing, seek deletion where applicable, and withdraw consent where processing relies on it. You may also ask about applicable portability/restrictions and challenge a decision affecting you. Rights depend on the circumstances; proportionate identity verification may be needed and any lawful limitation will be explained.',
      'Use Privacy and account for a portable summary, a broader access/correction request or deletion. The summary excludes credentials, private file identifiers and other people’s private contacts; request additional personal records separately. If unable to sign in, use Support. You can change optional cookie choices at any time. You may complain to Kenya’s Office of the Data Protection Commissioner without giving up that right by first contacting us.',
    ] },
    { id: 'security-updates', title: 'Security and changes', paragraphs: [
      'We use access controls, administrator verification, private evidence storage, upload limits and audit logging. These reduce risk; absolute security cannot be promised. Keep credentials private and report suspected misuse. Incidents are assessed and notifications provided where applicable law requires them.',
      'Material notice changes receive a new version. We explain changes affecting existing users and seek additional permission where required. An earlier acceptance does not authorize unrelated new purposes.',
    ] },
  ] },
  terms: { title: 'Terms of use', sections: [
    { id: 'service', title: 'The marketplace and eligibility', paragraphs: [
      'Mlezi is operated by Lintech Telecom for adult caregivers and employers/parents. Its current service provides listings, search, shortlists, reviews and introductions. Families hire and pay caregivers directly. Mlezi does not currently recruit or place workers, employ/supervise caregivers, provide immigration services, or become a party to a family’s care/employment agreement.',
      'You must be at least 18, provide accurate information and control the account you use. Do not impersonate someone or share login codes. Keep profile/contact information current. Verification does not authorize you to act for another person.',
    ] },
    { id: 'care-agreements', title: 'Agree the work separately', paragraphs: [
      'Families and caregivers must discuss duties, references, experience, pay, hours, rest, accommodation, transport and safety before agreeing to work together. A nanny profile does not automatically include general cleaning, laundry or whole-household cooking. Travel care needs an agreement about destinations, costs, accommodation and working hours.',
      'Both parties must meet applicable employment, wage, safeguarding, work-authorization and travel requirements. A listing or identity badge grants no permission to work in another country. Do not exploit workers, withhold identity documents or impose unlawful arrangements. These terms do not replace employment rights or determine the status of the actual working relationship.',
    ] },
    { id: 'trust', title: 'Identity, reviews and Premium', paragraphs: [
      'Caregivers require a profile photo, private ID and recent selfie for manual identity/18+ review before publication. Identity checked is not an issuer-validated guarantee, background/criminal-record check or assurance of suitability. Interview and check references independently. Identity changes or safety concerns can require re-review or restrict a profile.',
      'Reviews must honestly describe an employer’s own experience. Contact unlocking permits review submission but does not prove employment. Do not buy reviews, manipulate ratings, publish private details or post abusive allegations. Caregivers can reply; users can report concerns and administrators can assess visibility.',
      'Premium is optional paid priority among matching profiles, with rotating exposure. It does not buy an identity badge, better ratings, employment or guaranteed contacts. Search is not a hiring decision by Mlezi.',
    ] },
    { id: 'plans', title: 'Platform plans and manual payments', paragraphs: [
      'Browsing, shortlisting and a basic caregiver profile are free. Employer contact access is KES 300 for 30 days or KES 500 for 90 days; optional caregiver Premium is KES 500 for 365 days. These are platform access/visibility charges, separate from caregiver wages.',
      'Renewal is manual. No automatic recurring charge is authorized here. Early renewal extends the existing unexpired term; otherwise a term starts on confirmed activation. Previously unlocked contacts remain after ordinary expiry, while new unlocks require active access. Deletion and identity/safety restrictions can still affect access.',
      'Manual M-Pesa payment uses Paybill 4125123, account mlezicare. Review the selected plan and amount before paying, then submit the receipt code and paying phone in Membership. An administrator confirms receipt, amount, sender and destination against the business statement before activating access; a submitted code alone grants no membership or identity approval. Automated Paystack checkout is not enabled. For incorrect, duplicate, failed or unrecognized payments, contact Support for investigation and any applicable correction or refund; do not pay again while a report is pending. Rejection of a report does not reverse or refund an M-Pesa transfer automatically. This draft imposes no blanket no-refunds rule or waiver of statutory rights. Mlezi does not collect caregiver wages.',
    ] },
    { id: 'content-conduct', title: 'Content and conduct', paragraphs: [
      'Only upload information/images you are authorized to share. You retain rights in your content and permit Mlezi to store, display and process it as needed for the requested marketplace services, moderation and the Privacy notice. This does not transfer ownership or authorize unrelated advertising use of identity evidence.',
      'Do not harass, discriminate unlawfully, impersonate, scam, publish children’s or others’ private information, post unlawful content, scrape/resell protected contacts, submit false evidence or attack the service. Never put passwords, OTPs, ID images or payment PINs in public text or support tickets.',
    ] },
    { id: 'restrictions', title: 'Restrictions and leaving', paragraphs: [
      'We may remove content, pause publication, restrict contacts or suspend an account for suspected breaches, identity problems, safety or legal obligations. We explain the basis and offer a review route through Support where appropriate, without compromising privacy or investigations. Platform action does not change legal employment obligations.',
      'You can stop using the service and request deletion through Privacy and account. The Privacy notice explains the seven-day cancellation period, file removal and justified retention. Previously shared information cannot always be recalled. Use Support to request review of cancellation/refund concerns. Any refund must be investigated and processed separately; withdrawing access or rejecting a report does not itself reverse a payment.',
    ] },
    { id: 'support-responsibility', title: 'Support and responsibility', paragraphs: [
      'Use Support for account, technical, identity, privacy and safety concerns. Signed-out users can submit an issue with their email once delivery/spam protection is configured. Acknowledgements and staff replies are emailed. Our support commitment is to address an issue within 48 hours; it is not emergency response.',
      'We remain responsible for our own platform obligations. Families and caregivers remain responsible for their actual care and employment arrangements. Report interruptions, inaccurate information and misconduct for assessment. Nothing here excludes liability or removes consumer, employment, data-protection or other rights that applicable law does not allow us to exclude.',
      'These terms are prepared for a Kenya-focused marketplace under applicable Kenyan law. Cross-border arrangements may also involve other local requirements. Support can help seek a practical resolution without waiving access to competent courts, regulators or other lawful remedies. This draft imposes no compulsory private arbitration or blanket release of claims.',
    ] },
    { id: 'updates', title: 'Acceptance and updates', paragraphs: [
      'Read the terms and Privacy notice before completing a new account. We record the version accepted at account creation. Imported accounts are not treated as having accepted a version merely because records were migrated. Material changes will be explained and renewed acceptance requested where appropriate before they affect existing users.',
      'Future worker recruitment/placement, managed employment or payment services require updated terms and operational review before introduction.',
    ] },
  ] },
  cookies: { title: 'Cookie policy', sections: [
    { id: 'essential', title: 'Essential storage', paragraphs: ['The mlezi-cookie-consent cookie remembers the optional accepted/declined choice for up to 180 days, with SameSite=Lax and Secure on HTTPS. Authentication credentials use sessionStorage in the browser tab. During account creation, a registration draft containing your role, name, phone and email is held in sessionStorage and localStorage so a magic link can continue setup in another tab. Drafts are accepted for 30 minutes, cleared after account completion or sign-out, and expired copies are removed when next accessed. Passwords and email codes are not included in these drafts. Availability also depends on browser tab/session-restoration behavior: closing a tab is not a substitute for signing out.'] },
    { id: 'optional', title: 'Optional features', paragraphs: ['Only after acceptance do we remember search filters in sessionStorage and load Google Fonts. Google receives IP address and browser request information. Declining leaves browsing, registration and sign-in available with local fallback fonts. There are currently no analytics or advertising trackers. New trackers need their own assessment and appropriate permission.'] },
    { id: 'guest-check', title: 'Guest support anti-spam check', paragraphs: ['When you choose to load the guest-support check, Cloudflare Turnstile processes browser/network information to assess automated abuse. This is required for guest submission, not ordinary browsing or signed-in support. It is separate from optional fonts/search permission and still needs the applicable privacy/storage assessment before launch.'] },
    { id: 'choices', title: 'Change your choice', paragraphs: ['Use Cookie settings on any page. Declining clears optional search preferences and stops further optional font loading; it cannot undo earlier requests or instantly remove data already received by a provider. If the browser blocks a new preference, the banner explains that limitation and optional use is disabled for the current page.', 'Authentication/security requests, requested profile photos and normal service requests still operate as needed. The Privacy notice explains purposes, providers, retention and rights.'] },
  ] },
}
