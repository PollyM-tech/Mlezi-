# FAQ assistant and public domain

Implemented 1 November 2026. The owner confirmed **mlezicare.com** as the domain.
The intended frontend origin is `https://mlezicare.com` in the local public
configuration and example template. DNS, hosting, verified email and production
Convex origin settings are separate tasks; none were changed remotely here.
Indexing and legal-review flags remain off. Do not change the development Convex
`SITE_URL` to the production domain while using localhost authentication.

## Assistant behavior

“Mlezi Help” appears at the bottom right on public and private pages, including
account setup/restricted screens. It offers written FAQ questions, local keyword
search, topic filters, relevant app links and a support-ticket link. Answers cover
registration, password recovery, required photos/evidence, adult identity review,
travel care, household terminology, service categories, current planned prices,
expiry, Premium ranking, reviews, privacy, optional cookies and account deletion.

This is not generative AI or live chat. Opening/searching the widget makes no API
request, does not read an account or identity record, and stores no search/history
in cookies or browser storage. State clears when closed/reloaded. No AI key,
subscription, external chat widget or new Convex function is needed; normal site
hosting/bandwidth still applies. Support-form email usage remains separate.

Unknown questions receive a clear no-match state and link to Support. No ticket is
created automatically and no promise of real-time staff availability is shown.
Checkout answers explicitly say payments are not yet enabled. The FAQ cannot
approve identity, reset passwords, inspect payments or grant contact access.

## Layout and access

The panel adapts to mobile widths and short screens, with a scrollable body and
visible header/close action. It is a non-modal dialog: users can tab to the page.
Opening focuses search, selecting a question focuses its heading, and Escape or
Close returns focus to the launcher. It stays out of the way while the cookie
banner is open and works after either accepting or declining optional use.

## Maintaining answers

Edit `frontend/src/lib/faq.js`. The landing page's featured questions share this
data to avoid differing answers. Update FAQ/landing pricing, legal and payment
screens together when checkout is enabled. Answers are English in this version;
language-specific FAQ copies can be added after actual translation review.

`FaqAssistant.jsx` is mounted once in `Website.jsx`, outside authenticated content.
Its CSS is `frontend/src/faq-assistant.css`. Tests verify keyboard/focus behavior,
search/topics, unknown-question handoff, app links, current facts and no network or
storage writes. Production indexing still needs the existing launch configuration.
