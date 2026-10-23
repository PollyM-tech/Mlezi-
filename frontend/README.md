# Mlezi caregiver workspace

React + Vite frontend for the Flask API. Includes caregiver registration, login,
profile creation, viewing, editing, and a public preview.

## Run locally

Start the backend in a separate terminal:

```bash
cd backend
source .venv/bin/activate
flask --app app:create_app db upgrade
flask --app app:create_app run --port 5000
```

Then start the frontend from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173). Vite forwards `/api`
requests to Flask on port 5000. Backend secrets and Cloudinary credentials belong
in `backend/.env`, never in frontend environment variables.

For a separately hosted API, set `VITE_API_URL=https://your-api.example/api` at
build time and configure Flask CORS for the frontend origin. Production hosting
must route `/api` to Flask if `VITE_API_URL` is omitted. Vite's proxy is development-only.

## Checks

```bash
npm run build
npm run lint
node --test tests/api.test.mjs
```

From `backend`, run `.venv/bin/python -m unittest discover -s tests -v`.
Backend tests use an in-memory database and mocked storage, preserving local data.

## Session behavior

The access token lives in memory. The refresh token is in sessionStorage so a
reload in the same tab can restore the session; closing the tab ends persistence.
Requests automatically refresh expired access tokens. Sign out clears browser
credentials; server-side token revocation is not implemented. Script-readable
refresh storage should be revisited with an HttpOnly-cookie design before launch.

## Caregiver journey

Create a caregiver account or sign in with an existing account. Accounts without
a profile see the creation form; other caregivers see their saved profile.
A photo and national ID image are required for initial creation, following the
existing backend policy. JPEG, PNG, and WebP images are accepted, at most 5 MB each.
Real uploads require working Cloudinary credentials. ID uploads are authenticated
assets and are never returned in profile responses.

Caregivers can edit their details, phone, work arrangements, pay, skills,
available weekdays, and photo. Live-out services require a location. Profile
edits do not require documents to be uploaded again. National ID replacement
is deliberately excluded from self-service pending the admin workflow.

The public preview at `#/caregivers/<id>` excludes account contact fields and ID
references. Users must avoid placing private information in their free-text bio.

Employer search, contact unlocking, payments, certificate submission/admin
verification, password reset, and email verification are separate milestones.
