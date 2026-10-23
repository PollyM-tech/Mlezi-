# Childcare & Early Education Marketplace
## Technical Documentation

**Product:** Childcare & Early Education Marketplace (working name: Nanny Project)
**Product Owner:** MylesCorp Technologies
**Prepared by:** Pauline Moraa
**Version:** 2.0
**Date:** September 2026
**Status:** MVP — Build Phase

**Implementation update (23 October 2026):** The caregiver account/profile journey is implemented. See [caregiver implementation notes](caregiver-implementation.md) for the current API contract, decisions that differ from this original specification, validation, and remaining work.

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

**Core principle:** Caregivers are discoverable. Employers are private. Verification is optional but meaningful. Trust is built through identity verification and two-way reputation.

---

## 2. Scope

### In scope (MVP)
- Caregiver registration, profile creation, and management
- Employer registration and private search/filter
- Two-tier verification (ID-only vs. ID + Certificate of Good Conduct)
- Contact unlock via M-Pesa-paid 90-day pass
- Optional caregiver featured/boost placement
- Basic admin moderation (verification approval, reports)
- Two-way reviews (may ship at v1.1 if timeline requires)

### Out of scope (MVP — deferred to future versions)
- In-platform messaging
- AI-powered matching (rules-based matching only for MVP)
- Mobile native apps (web-first)
- Bookings/contracts management
- Special-needs caregivers, tutors, activity instructors (future category expansion)
- Employer public profiles (by design, permanently out of scope — not a "future" item)

---

## 3. User Roles & Functional Requirements

| Role | Visibility | Core Actions |
|---|---|---|
| **Caregiver** | Public profile | Register free, build profile, set pay/availability/employment type, optional verification, optional featured boost |
| **Employer** | Private account, never listed | Search, filter, shortlist, purchase unlock pass, unlock contacts, review caregivers |
| **Admin** | Internal only | Approve/reject verification, moderate profiles and reviews, handle reports, monitor payments |

### Service Categories
**Childcare:** Nannies · Babysitters · Childminders · Night caregivers · Holiday caregivers
**Early Education:** Playgroup teachers · PP1 teachers · PP2 teachers · Early Childhood Educators · CBC specialists · Cambridge early-years teachers

---

## 4. Non-Functional Requirements

- **Security:** All identity documents (national ID, Certificate of Good Conduct) stored privately, accessible only to authorized admin accounts; never exposed via public API responses. Passwords hashed (bcrypt), never stored or logged in plaintext.
- **Data privacy:** Handling of national ID data and police clearance documents should follow Kenya's Data Protection Act, 2019 principles — collect only what's needed, restrict access, and allow account/data deletion on request.
- **Performance:** Search/filter queries should return results in well under 1 second at MVP scale (low thousands of profiles); revisit indexing strategy as the caregiver base grows.
- **Availability:** Standard single-region hosting is sufficient for MVP; no multi-region redundancy required at this stage.
- **Auditability:** Payment and verification-approval actions should be timestamped and attributable to the acting admin/user for dispute resolution.

---

## 5. System Architecture

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
6. On purchase, backend triggers M-Pesa STK push; on successful webhook callback, `unlock_pass_expires_at` is set to `now + 90 days`.

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
    verification_status = db.Column(db.Enum('unverified', 'id_only', 'verified'), default='unverified')
    id_document_url = db.Column(db.String, nullable=True)        # private, admin-only
    good_conduct_cert_url = db.Column(db.String, nullable=True)  # private, admin-only, required for 'verified'
    is_featured = db.Column(db.Boolean, default=False)
    featured_until = db.Column(db.DateTime, nullable=True)
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
    type = db.Column(db.Enum('unlock_pass', 'featured_boost'))
    amount = db.Column(db.Integer)  # 200 or 100
    status = db.Column(db.Enum('pending', 'completed', 'failed'))
    mpesa_ref = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    rating = db.Column(db.Integer)
    comment = db.Column(db.Text)
    is_public = db.Column(db.Boolean)   # True for caregiver reviews, False for employer reviews
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
- **Verified badge:** only granted once both `id_document_url` and `good_conduct_cert_url` are admin-approved.

---

## 9. API Documentation

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
| `POST /api/verification/submit` | Caregiver | ID doc (+ optional cert) | `202` pending review |
| `GET /api/verification/status` | Caregiver | — | `200` + status |
| `POST /api/admin/verification/:id/approve` | Admin | — | `200` |
| `POST /api/admin/verification/:id/reject` | Admin | `{reason}` | `200` |

### Payments & Contact
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/payments/unlock-pass` | Employer | — | `202` + STK push initiated |
| `POST /api/payments/featured-boost` | Caregiver | — | `202` + STK push initiated |
| `POST /api/payments/mpesa/callback` | M-Pesa webhook | Daraja payload | `200` (updates Payment + pass/boost status) |
| `POST /api/contact/unlock/:caregiver_id` | Employer | — | `200` + contact, or `402` if no active pass |

### Reviews & Reports
| Method & Path | Auth Required | Body | Response |
|---|---|---|---|
| `POST /api/reviews` | Authenticated, prior interaction required | `{to_user_id, rating, comment}` | `201` |
| `GET /api/caregivers/:id/reviews` | Public | — | `200` + list |
| `POST /api/reports` | Authenticated | `{reported_user_id, reason, details}` | `201` |
| `GET /api/admin/reports` | Admin | — | `200` + list |

---

## 10. Testing Strategy

- **Postman collections:** each API group (Auth, Caregivers, Verification, Payments, Reviews, Reports) gets its own Postman collection, tested independently before frontend integration. Environment variables used for base URL and test JWT tokens per role.
- **Unit tests (backend):** cover core business logic in isolation — unlock-pass expiry calculation, conditional location-filter logic, verification-tier assignment, JWT encode/decode.
- **Integration tests:** full request flows, e.g. registration → login → profile creation → search → unlock-pass purchase (mocked M-Pesa) → contact unlock.
- **Manual QA pass:** before each release, a checklist run through the MVP Success Criteria (Section 16) as real user flows in the browser.

---

## 11. Third-Party Integrations — M-Pesa

- **Provider:** Safaricom Daraja API (STK Push / Lipa Na M-Pesa Online).
- **Flow:**
  1. Backend initiates STK push to the user's phone number with the relevant amount (KES 200 unlock pass or KES 100 featured boost).
  2. User enters M-Pesa PIN on their phone to confirm.
  3. Safaricom sends an asynchronous callback to `POST /api/payments/mpesa/callback` with the transaction result.
  4. Backend updates the `Payment` record status and, on success, updates `unlock_pass_expires_at` or `featured_until` accordingly.
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

| Item | Who pays | Amount | Model |
|---|---|---|---|
| Registration & basic listing | Caregiver | Free | Ongoing |
| Search, filter, shortlist | Employer | Free | Ongoing |
| Contact unlock pass | Employer | KES 200 | 90-day pass, unlimited unlocks within window |
| Featured/"most seen" placement | Caregiver | KES 100 | Optional boost, time-limited |

**Future (post-traction):** caregiver listing fee (~KES 50), premium caregiver profiles/analytics, employer unlock-pass bundles.

### Location rule
- `employment_type = live-in` → location is informational only, not a search filter.
- `employment_type = day/live-out` → location is a required search filter.

### Verification tiers
- **Unverified / ID-only:** national ID uploaded, no badge or neutral indicator.
- **Verified:** national ID **and** Certificate of Good Conduct uploaded and admin-approved — green "Verified" badge shown.

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
- M-Pesa Daraja sandbox integration for unlock pass (KES 200) and featured boost (KES 100)
- Contact unlock flow with `ContactUnlock` persistence logic

**Phase 4 — Trust & safety**
- Verification submission + admin approval flow (ID-only vs. ID+Certificate)
- Reporting system + basic admin dashboard
- Liability/ToS page published

**Phase 5 — Reputation (can ship slightly after launch)**
- Two-way review system (public for caregivers, private/internal for employers)

---

## 16. MVP Success Criteria

1. Caregivers can register and create a complete profile for free.
2. Caregivers can set pay, availability, and employment type, with location required only when relevant.
3. Caregivers can optionally submit for ID-only or full verification.
4. Employers can search, filter, and shortlist caregivers without paying.
5. Employers can purchase a 90-day unlock pass via M-Pesa and unlock caregiver contacts within that window.
6. Already-unlocked contacts remain accessible to an employer after the pass lapses.
7. Caregivers can optionally pay for featured placement.
8. Admin can approve/reject verification submissions and handle user reports.
9. Two-way reviews can be submitted after a genuine interaction (v1.1 acceptable if not day-one).
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
