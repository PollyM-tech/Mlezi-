# Childcare & Early Education Marketplace

**26 October 2026 security/age-policy update:** Caregiver-only photo gating and three-image identity submission are enforced. Employer publication/contact access requires an administrator-confirmed 18+ identity check; uploads alone do not verify age. Admin TOTP, upload sanitization/quotas, privacy requests/deletion, audit and retention controls are implemented on Convex. See [current implementation, tests and remaining production blockers](production-security-implementation.md). Earlier API/staged implementation details below are historical where they differ.

## Technical Documentation

**Product:** Childcare & Early Education Marketplace (working name: Nanny Project)
**Product Owner:** MylesCorp Technologies
**Prepared by:** Pauline Moraa
**Version:** 2.1
**Date:** 23 October 2026
**Status:** MVP — Build Phase

**Backend migration update (24 October 2026):** Convex application functions, storage, permissions, and UI integration are active. Existing personal records and identity images were transferred with owner approval and verified; Flask is no longer required to run the app. See [Convex cutover status](convex-cutover.md). M-Pesa remains the final stage. The Flask architecture/API descriptions below are retained as the historical specification and rollback reference.

**Implementation update (23 October 2026):** The caregiver account/profile journey and marketplace membership, discovery, contact-access, and public-review code are implemented. See [marketplace implementation and setup](marketplace-implementation.md) for delivered endpoints, migration, testing, and pending M-Pesa configuration. See [caregiver implementation notes](caregiver-implementation.md) for the current API contract, decisions that differ from this original specification, validation, and remaining work.

---

## Table of Contents
1. Executive Summary
2. Scope
3. User Roles & Functional Requirements
4. Non-Functional Requirements
5. System Architecture
6. Technology Stack
7. Authentication & Authorization
8. Data Model
9. API Documentation
10. Testing Strategy
11. Third-Party Integrations (M-Pesa)
12. Deployment & Environments
13. Business Rules & Monetization
14. Liability & Platform Policy
15. Build Roadmap
16. MVP Success Criteria
17. Long-Term Vision
18. Glossary

---

## 1. Executive Summary

A trusted marketplace connecting parents/employers with nannies, babysitters, childminders, and early-years educators in Kenya. Caregivers create public professional profiles; employers search privately and pay to unlock a caregiver's contact details.

**Core principle:** Caregivers are discoverable. Employers are private. Verification is optional but meaningful. Trust is built through identity checks and public employer reviews; payment buys Premium visibility only.

---

## 2. Scope

### In scope (MVP)
- Caregiver registration, profile creation, and management
- Employer registration and private search/filter
- Identity checking separate from paid membership; no Certificate of Good Conduct requirement
- Contact unlock via manually renewed M-Pesa passes: KES 300 for 30 days or KES 500 for 90 days
- Optional caregiver Premium membership: KES 500 for 365 days, with priority placement among matching profiles
- Basic admin moderation (verification approval, reports)
- Public employer-to-caregiver reviews with automatically calculated average star ratings

### Out of scope (MVP — deferred to future versions)
- In-platform messaging
- AI-powered matching (rules-based matching only for MVP)
- Mobile native apps (web-first)
- Bookings/contracts management
- Special-needs caregivers, tutors, activity instructors (future category expansion)
- Employer public profiles (by design, permanently out of scope — not a "future" item)

---

## 3. User Roles & Functional Requirements

**Employer workspace implementation:** See [employer/parent workspace](employer-implementation.md)
for the private overview, account editing, saved profiles, contact library and
current discovery filters. M-Pesa setup/live payment testing are deferred until last.

| Role | Visibility | Core Actions |
|---|---|---|
| **Caregiver** | Public profile | Register free, build profile, set pay/availability/employment type, identity checking, optional yearly Premium membership |
| **Employer** | Private account, never listed | Search, filter, shortlist, purchase unlock pass, unlock contacts, review caregivers |
| **Admin** | Internal only | Approve/reject verification, moderate profiles and reviews, handle reports, monitor payments |

### Service Categories
**Childcare:** Nannies · Babysitters · Childminders · Night caregivers · Holiday caregivers
**Early Education:** Playgroup teachers · PP1 teachers · PP2 teachers · Early Childhood Educators · CBC specialists · Cambridge early-years teachers

---

## 4. Non-Functional Requirements

- **Security:** All identity documents (national ID and any identity-check evidence) stored privately, accessible only to authorized admin accounts; never exposed via public API responses. Passwords hashed (bcrypt), never stored or logged in plaintext.
- **Data privacy:** Handling of national ID data and police clearance documents should follow Kenya's Data Protection Act, 2019 principles — collect only what's needed, restrict access, and allow account/data deletion on request.
- **Performance:** Search/filter queries should return results in well under 1 second at MVP scale (low thousands of profiles); revisit indexing strategy as the caregiver base grows.
- **Availability:** Standard single-region hosting is sufficient for MVP; no multi-region redundancy required at this stage.
- **Auditability:** Payment and verification-approval actions should be timestamped and attributable to the acting admin/user for dispute resolution.

---

## 5. System Architecture

The public root now introduces Mlezi, with family/caregiver signup and filtered
discovery entry points. Signed-in workspaces use `#/workspace`; see
[landing-page implementation](landing-page.md) for routes and browser QA.

```
                ┌───────────────────────┐
                │   React.js Frontend   │
                │ (Employer / Caregiver │
                │     / Admin views)    │
                └───────────┬───────────┘
                            │ REST API (JWT in Authorization header)
                            ▼
                ┌───────────────────────┐
                │      Flask API        │
                │  (Auth, Caregivers,   │
                │  Verification,        │
                │  Payments, Reviews)   │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   SQLAlchemy ORM      M-Pesa Daraja API    JWT Auth Middleware
        │                (STK Push /
        ▼               Webhook callback)
  SQLite (dev)  →  PostgreSQL (production)
```

### Example request flow — Employer unlocks a caregiver's contact
1. Employer clicks "Unlock Contact" on a caregiver profile.
2. Frontend sends `POST /api/contact/unlock/:caregiver_id` with JWT access token.
3. API middleware validates the JWT and confirms role = `employer`.
4. API checks `ContactUnlock` table — if already unlocked, return contact immediately (no charge).
5. If not yet unlocked, API checks `EmployerProfile.unlock_pass_active` and expiry.
   - If pass is active → create `ContactUnlock` record, return contact.
   - If pass is inactive/expired → return `402 Payment Required`, frontend redirects to unlock-pass purchase.
6. Employer selects the 30-day (KES 300) or 90-day (KES 500) plan and manually initiates an M-Pesa payment. Only after confirmed payment does the API set `unlock_pass_expires_at = max(now_utc, existing_expiry) + plan_duration`.
7. Expiry prevents new unlocks but never removes existing `ContactUnlock` records or access to those contacts.

---

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (JavaScript) |
| Backend | Python (Flask) |
| ORM | SQLAlchemy |
| Database (dev) | SQLite |
| Database (production) | PostgreSQL |
| Authentication | JWT (JSON Web Tokens) |
| API Testing | Postman |
| Payments | M-Pesa Daraja API |
| Version Control | Git / GitHub |

---

## 7. Authentication & Authorization

### Authentication — JWT
- On successful login, the API issues:
  - **Access token** — short-lived (e.g., 15–30 min), sent as `Authorization: Bearer <token>` on every subsequent request.
  - **Refresh token** — longer-lived (e.g., 7–30 days), used solely to obtain a new access token via `POST /api/auth/refresh` without forcing the user to log in again.
- Tokens are signed (HS256 or RS256) with a secret/key stored only in environment variables — never committed to source control.
- Access token payload includes: `user_id`, `role`, `issued_at`, `expires_at`.

### Authorization — Role-Based Access Control (RBAC)
- Every protected route is guarded by middleware that decodes the JWT and checks the embedded `role` claim before proceeding.
- Examples:
  - `PUT /api/caregivers/:id` — allowed only if `user_id` in token matches the profile owner.
  - `POST /api/admin/verification/:id/approve` — allowed only if `role == 'admin'`.
  - `POST /api/contact/unlock/:id` — allowed only if `role == 'employer'`.
- Unauthorized requests return `401 Unauthorized` (missing/invalid token) or `403 Forbidden` (valid token, wrong role/owner).

### Password handling
- Passwords hashed with bcrypt (or equivalent) before storage.
- No password or raw token is ever logged.

---

## 8. Data Model

The following is a target schema sketch, not the exact deployed models. Migration `e48c16d972ab` adds the new Premium entitlement and payment plan fields.
Legacy `featured_boost`, `is_featured`, and `featured_until` fields are retained
for historical compatibility and do not grant the new Premium benefit. See `backend/app/models.py` for the current schema.

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.Enum('caregiver', 'employer', 'admin'))
    email = db.Column(db.String, unique=True)
    phone = db.Column(db.String)
    password_hash = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CaregiverProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    name = db.Column(db.String)
    photo_url = db.Column(db.String)
    service_category = db.Column(db.String)
    employment_type = db.Column(db.String)          # live-in, live-out/daily, part-time, etc.
    location = db.Column(db.String, nullable=True)  # only meaningful if employment_type is day/live-out
    years_experience = db.Column(db.Integer)
    curriculum = db.Column(db.String, nullable=True)   # CBC, Cambridge, both
    expected_pay_min = db.Column(db.Integer)
    expected_pay_max = db.Column(db.Integer)
    pay_period = db.Column(db.Enum('monthly', 'daily', 'hourly'))
    availability = db.Column(db.JSON)
    verification_status = db.Column(db.Enum('unverified', 'pending', 'verified', 'rejected'), default='unverified')
    id_document_url = db.Column(db.String, nullable=True)        # private, admin-only
    premium_expires_at = db.Column(db.DateTime, nullable=True)  # planned; active only while expiry > now
    rating_avg = db.Column(db.Float, default=0)

class EmployerProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    unlock_pass_active = db.Column(db.Boolean, default=False)
    unlock_pass_expires_at = db.Column(db.DateTime, nullable=True)

class ContactUnlock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, db.ForeignKey('employerprofile.id'))
    caregiver_id = db.Column(db.Integer, db.ForeignKey('caregiverprofile.id'))
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    type = db.Column(db.Enum('unlock_pass', 'caregiver_premium'))
    plan_code = db.Column(db.String)  # employer_30_days, employer_90_days, caregiver_365_days
    duration_days = db.Column(db.Integer)  # server-selected: 30, 90, or 365
    amount = db.Column(db.Integer)  # server-selected: KES 300 or KES 500
    status = db.Column(db.Enum('pending', 'completed', 'failed'))
    mpesa_ref = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    rating = db.Column(db.Integer)
    comment = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=True)  # employer-to-caregiver reviews are public
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    reported_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    reason = db.Column(db.String)
    details = db.Column(db.Text)
    status = db.Column(db.Enum('open', 'reviewed', 'resolved'), default='open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### Core logic rules
- **Contact access check:** look up `ContactUnlock` first — if already unlocked, show contact for free. Otherwise require an active `unlock_pass` before creating a new `ContactUnlock` record.
- **Search filter:** apply the location filter only when `employment_type` is day/live-out.
- **Identity checked badge:** awarded only after an admin completes identity checks; payment and reviews never grant this status. No criminal-background check is implied.
- **Renewal:** for the purchased entitlement, use `max(now_utc, existing_expiry) + purchased_duration`; pending, failed, and duplicate payment callbacks must not extend it.
- **Ranking:** apply employer filters first, then prioritize active Premium caregivers and rotate order within that tier for fair exposure. Expired Premium profiles remain discoverable.

---

## 9. API Documentation

The following tables mix target contracts and implemented endpoints. Payment and
contact access are implemented; identity-verification submission/approval remains
planned. Public review writes use `PUT /api/caregivers/:id/review`, documented in
the [marketplace implementation](marketplace-implementation.md).
The implemented caregiver endpoints are documented in [caregiver implementation notes](caregiver-implementation.md).

### Auth
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/auth/register` | No | `{email, phone, password, role}` | `201` + user object |
| `POST /api/auth/login` | No | `{email, password}` | `200` + `{access_token, refresh_token}` |
| `POST /api/auth/refresh` | Refresh token | `{refresh_token}` | `200` + new `access_token` |
| `GET /api/auth/me` | Access token | — | `200` + current user object |

### Caregivers
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/caregivers` | Caregiver role | Profile fields | `201` + profile object |
| `GET /api/caregivers` | Public | Query params: filters | `200` + list of profiles |
| `GET /api/caregivers/:id` | Public | — | `200` + profile (no private docs) |
| `PUT /api/caregivers/:id` | Owner only | Updated fields | `200` + updated profile |

### Verification
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/verification/submit` | Caregiver | Identity evidence for admin review; no Good Conduct certificate required | `202` pending review |
| `GET /api/verification/status` | Caregiver | — | `200` + status |
| `POST /api/admin/verification/:id/approve` | Admin | — | `200` |
| `POST /api/admin/verification/:id/reject` | Admin | `{reason}` | `200` |

### Payments & Contact
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/payments/unlock-pass` | Employer | `{plan_code}`: `employer_30_days` or `employer_90_days` | `202` + STK push initiated |
| `POST /api/payments/caregiver-premium` | Caregiver | Plan fixed at KES 500 / 365 days | `202` + STK push initiated |
| `POST /api/payments/mpesa/callback` | M-Pesa webhook | Daraja payload | `200` (updates Payment + employer pass or caregiver Premium expiry) |
| `POST /api/contact/unlock/:caregiver_id` | Employer | — | `200` + contact, or `402` if no active pass |

### Reviews & Reports
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/reviews` | Employer with a prior contact unlock for this caregiver | `{to_user_id, rating, comment}` | `201`; one review per employer/caregiver pair |
| `GET /api/caregivers/:id/reviews` | Public | — | `200` + list |
| `POST /api/reports` | Authenticated | `{reported_user_id, reason, details}` | `201` |
| `GET /api/admin/reports` | Admin | — | `200` + list |

---

## 10. Testing Strategy

- **Postman collections:** each API group (Auth, Caregivers, Verification, Payments, Reviews, Reports) gets its own Postman collection, tested independently before frontend integration. Environment variables used for base URL and test JWT tokens per role.
- **Unit tests (backend):** cover core business logic in isolation — unlock-pass expiry calculation, conditional location-filter logic, identity-check status assignment, early renewals, Premium expiry, duplicate callbacks, and post-expiry contact access, JWT encode/decode.
- **Integration tests:** full request flows, e.g. registration → login → profile creation → search → unlock-pass purchase (mocked M-Pesa) → contact unlock.
- **Manual QA pass:** before each release, a checklist run through the MVP Success Criteria (Section 16) as real user flows in the browser.

---

## 11. Third-Party Integrations — M-Pesa

- **Provider:** Safaricom Daraja API (STK Push / Lipa Na M-Pesa Online).
- **Flow:**
  1. User manually selects a plan and initiates payment. Backend chooses the price and duration: employer KES 300 / 30 days, employer KES 500 / 90 days, or caregiver Premium KES 500 / 365 days. The client cannot supply an arbitrary price or duration.
  2. User enters M-Pesa PIN on their phone to confirm.
  3. Safaricom sends an asynchronous callback to `POST /api/payments/mpesa/callback` with the transaction result.
  4. After validated success, backend records the payment and extends the relevant entitlement from `max(now_utc, existing_expiry)`. Callback processing must be idempotent: one payment grants one extension.
  5. Renewals are manual M-Pesa purchases; there is no automatic debit. Employer pass expiry blocks only new contact unlocks. Caregiver Premium expiry removes priority placement without removing the free profile.
- **Credentials:** Consumer key/secret and passkey stored as environment variables, never committed to source control.
- **Sandbox first:** use Daraja's sandbox environment for development/testing before switching to production credentials.

---

## 12. Deployment & Environments

| Environment | Purpose | Database |
|---|---|---|
| Development | Local dev, feature building | SQLite |
| Staging | Pre-release testing, M-Pesa sandbox | PostgreSQL |
| Production | Live users, real M-Pesa transactions | PostgreSQL |

- Environment variables (JWT secret, database URL, M-Pesa credentials) managed via `.env` files locally and secret management on the hosting platform — never committed to Git.
- Recommended initial hosting: a single-region deployment (e.g., Render, Railway, or a VPS) is sufficient for MVP scale.

---

## 13. Business Rules & Monetization

**Agreed product rules — 23 October 2026.** These rules replace the original
KES 200 employer pass and KES 100 caregiver boost. Payment, ranking, and public-review code is now implemented; Daraja setup and
live sandbox testing are outstanding. Identity-check approval remains separate
planned work. See the marketplace implementation notes.

| Item | Who pays | Amount | Duration / benefit |
|---|---|---|---|
| Registration & basic profile | Caregiver | Free | Profile remains available without Premium |
| Registration, browsing, filters, shortlist | Employer | Free | No contact access to new caregivers without an active pass |
| Monthly contact-access service fee | Employer | KES 300 | Exactly 30 days; unlimited new unlocks while active |
| Three-month contact-access service fee | Employer | KES 500 | Exactly 90 days; unlimited new unlocks while active |
| Premium membership | Caregiver | KES 500 | Exactly 365 days; priority within matching categories and filters |

### Contact access and expiry

1. Check the employer/caregiver `ContactUnlock` record first. If it exists,
   return the contact even when the employer's pass has expired.
2. Otherwise require an employer pass with an expiry strictly later than the
   current UTC time. On success, persist a unique unlock record and return contact.
3. Without an active pass, reject a new unlock with `402 Payment Required`.
4. Renewal is needed only for new unlocks. Subscription expiry must never delete
   existing unlock records. Other access controls still apply.

### Manual renewals and durations

- Purchases and renewals are manual M-Pesa payments, not recurring debits.
- Monthly means 30 days; three months means 90 days; yearly means 365 days.
- Calculate the new expiry as `max(now_utc, existing_expiry) + purchased_duration`.
  If there is no existing expiry, use `now_utc`. Early renewal preserves unused time.
- Employer renewals use the duration of the purchased plan, including when
  switching between 30-day and 90-day plans.
- Grant access only on confirmed successful payment. Pending/failed payments
  grant nothing, and repeated callbacks must not extend access twice.
- Premium expiry removes paid priority but leaves the caregiver's free profile
  and identity-check status intact. The old paid featured boost is discontinued.

### Search and recommendation ranking

- Apply the employer's requested category and other filters before paid priority.
- Within matching results, active Premium caregivers appear before free caregivers.
- Rotate order among matching Premium caregivers for fair exposure, keeping
  pagination stable within a results session. Use the same principle in recommendations.
- Label paid placement as Premium. Payment buys visibility, not a guarantee of work,
  identity verification, or a higher rating.

### Location rule

- Use the current `service_types` list instead of the old `employment_type` field.
- Live-out services require location; live-in location is informational.
- Apply location filtering when the requested arrangement is live-out.

### Identity, membership, and reputation

- **Identity checked:** granted only after an admin completes identity checks,
  such as reviewing ID and comparing a selfie or video check. Record the check
  date. Upload alone is insufficient; exact review procedures remain implementation work.
- A Certificate of Good Conduct is no longer required by this product rule.
  Identity checking does not imply a criminal-background check.
- **Premium member:** yearly paid visibility benefit, independent of identity status.
- **Employer reviews:** public 1–5-star ratings and written feedback. Automatically
  recalculate the average and review count after creation, edits, or moderation.
- Only employers who previously unlocked that caregiver's contact may review;
  one review per employer/caregiver pair, editable by the author. Pass expiry
  does not remove that prior interaction record. An unlock does not prove hiring.
- Publish reviews automatically with the employer's first name and review date,
  excluding contact details. Caregivers can reply and report abuse, not delete reviews.
  Admins can moderate abusive reviews. New caregivers display “No reviews yet”.
- Employer accounts remain private; a limited review attribution is not a public
  employer directory. Collect a display name when implementing review submission.

---

## 14. Liability & Platform Policy

The platform's Terms of Service should state clearly:

> MylesCorp Technologies and this platform act solely as a marketplace connecting caregivers and employers. We are **not liable** for the conduct, actions, or outcomes of any caregiver or employer using the platform — including but not limited to theft, misconduct, violence, or any criminal act committed by a party met through the platform. Verification badges reflect documents submitted and reviewed at a point in time and are not a guarantee of a caregiver's or employer's future conduct.
>
> The platform **will cooperate with law enforcement and relevant authorities** in the event of a reported crime or serious misconduct involving a user, including providing account and verification records as legally required.
>
> Users are encouraged to report any concerning behavior through the in-platform reporting feature. All reports are reviewed by an administrator.

**Note (not legal advice):** this wording gives you a clear public position and shows good-faith cooperation with authorities, which matters for your standing if something ever goes wrong — but it doesn't make the platform immune from liability in every case (e.g., if a serious, repeated report was ignored). Have a lawyer review and finalize this clause before launch, given the platform deals with childcare access.

---

## 15. Build Roadmap (Phased)

**Phase 1 — Foundations**
- User model + JWT auth (register/login/refresh/me) for caregiver & employer roles
- Caregiver profile create/edit (with conditional location logic)

**Phase 2 — Discovery**
- Public search + filters (service, curriculum, experience, pay, verification, and conditional location)
- Caregiver profile view page

**Phase 3 — Monetization core**
- M-Pesa Daraja sandbox integration: employer KES 300 / 30 days or KES 500 / 90 days; caregiver Premium KES 500 / 365 days
- Manual renewals, early-renewal extensions, and idempotent payment processing
- Contact unlock flow with `ContactUnlock` persistence logic

**Phase 4 — Trust & safety**
- Identity evidence submission + admin approval; identity checking is separate from payment and ratings, without a Good Conduct certificate requirement
- Reporting system + basic admin dashboard
- Liability/ToS page published

**Phase 5 — Reputation (can ship slightly after launch)**
- Public employer-to-caregiver reviews, one per employer/caregiver pair, with automatic average ratings and review counts

---

## 16. MVP Success Criteria

1. Caregivers can register and create a complete profile for free.
2. Caregivers can set pay, availability, and employment type, with location required only when relevant.
3. Caregiver identity checks are admin-approved, separate from Premium payment and ratings; uploading ID alone does not award a badge.
4. Employers can search, filter, and shortlist caregivers without paying.
5. Employers can manually purchase KES 300 / 30-day or KES 500 / 90-day passes via M-Pesa. Early renewals extend the existing expiry; expired passes block only new unlocks.
6. Already-unlocked contacts remain accessible to an employer after the pass lapses.
7. Caregivers can purchase KES 500 / 365-day Premium membership. Matching filters take precedence, then active Premium profiles receive rotating priority placement. Expiry preserves the free profile.
8. Admin can approve/reject verification submissions and handle user reports.
9. Employers with prior contact unlocks can submit public 1–5-star reviews, one per caregiver, and update their own review. Averages and counts update automatically. An unlock establishes eligibility, not proof of employment.
10. Terms of Service (including the liability clause) are published and accessible before public launch.

---

## 17. Long-Term Vision (post-MVP)

Expand into a broader children's care, education, and activities marketplace: tutors, swimming/music/sports instructors, special-needs caregivers, after-school care — plus AI-powered matching, in-platform messaging, bookings, contracts, and a mobile app.

---

## 18. Glossary

| Term | Meaning |
|---|---|
| CBC | Competency-Based Curriculum (Kenya's national curriculum) |
| PP1 / PP2 | Pre-Primary 1 / 2 — early-years education levels in the Kenyan system |
| Certificate of Good Conduct | Police clearance certificate issued by Kenya's DCI |
| JWT | JSON Web Token — used for stateless authentication |
| STK Push | Safaricom's "SIM Toolkit" prompt that requests M-Pesa PIN entry on a user's phone |
| RBAC | Role-Based Access Control |


### Caregiver completion update — 24 October 2026

Caregiver workspace, travel/holiday childcare and childcare while parents work or cook are implemented. Profiles support availability pause/resume, child age groups, languages, travel scope and travel arrangements. Paused profiles remain accessible directly and in saved/unlocked lists but cannot receive new contact unlocks and are excluded from search. Travel category discovery also includes caregivers offering travel as an additional service.

Identity checking now has private selfie submission and an admin review queue with temporary private ID/selfie links, explicit comparison confirmations and rejection reasons. Approved identity checking is a one-time account check: profile name/photo changes preserve approval. Photo changes during a pending review require a fresh submission. Payment never grants an identity badge. See `caregiver-implementation.md` for acceptance tests, migration details and remaining live-storage checks. M-Pesa activation remains the final integration task.


### Care option consolidation — 24 October 2026

Separate childcare-while-working/cooking services are removed in favor of Part-time. Overnight sleep training is consolidated into Overnight / night care (legacy primary categories map to Newborn & maternity / night nanny). Evening and Events are removed in favor of On-call / occasional babysitting. Existing profiles and saved search filters map to these replacements; travel care is retained. This supersedes earlier option lists in this document.


### Further service simplification — 24 October 2026

Part-time and Short notice are no longer offered as separate options in forms, discovery, or landing pages. Existing selections and saved searches map to On-call / occasional babysitting, with duplicates removed and other services retained. This supersedes the earlier Part-time consolidation. Working hours and duties are agreed directly with the family. Migration `b830e295c614` preserves profiles and their other details.
