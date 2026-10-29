# Flask retirement — 29 October 2026

The owner confirmed that Convex is the only backend. The application already used Convex; this cleanup removes the remaining alternative runtime and source tree.

- Removed `backend/` (Flask application, requirements, Python migrations/tests/export scripts, virtual environment and local instance files) from the active project.
- Before removal, created and verified a private archive of 48 original source/config/database files under Git-ignored `.backups/`. The directory is mode 0700 and archive mode 0600. Generated `.venv`/caches were omitted. This preserves pre-existing uncommitted backend edits and the old database without retaining a runnable second backend in the source tree. Do not publish the archive; it contains private credentials and records.
- Confirmed local historical counts and completed Convex migration counts agree: three accounts, one caregiver, one employer, one shortlist, no contact unlocks/reviews/payments. No Convex record or cloud file was removed.
- Removed legacy AuthForm, JWT refresh/session storage handling, native-token-to-Flask bridge, backend selector flags and the Vite port-5000 proxy.
- `main.jsx` always uses ConvexSession. All UI API calls dispatch to Convex functions. Public reads need no auth session; protected reads require one. Revoked-session handling is scoped so an older request cannot sign out a newer account.
- Removed obsolete HTTP bridge/Flask token tests and replaced them with native API/session tests. Convex/auth/consent/search tests remain.
- Public Convex URLs are the only backend connection values in `.env.local`/`.env.example`. Secret values were not printed or migrated into client variables.
- Payment checkout remains disabled while Paystack integration is pending; this cleanup does not enable the unconnected Daraja draft or initiate any payments.

Use `frontend/README.md` for current setup and testing. Historical implementation/migration documents remain for traceability; their Flask paths, backend-selector variables and Python commands no longer apply. Recovery copies are not active backups of subsequent Convex changes; maintain separate Convex database/file backups and the administrator encryption key as described in the security implementation notes.
