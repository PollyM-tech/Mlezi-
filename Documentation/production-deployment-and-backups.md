# Production deployment and recovery

## Verify the live backend without changing it

1. In the Convex dashboard, open the Mlezi project and select its **Production**
   deployment. Copy its deployment URL (`.convex.cloud`) and HTTP Actions URL
   (`.convex.site`). A URL's suffix alone does not identify its deployment type.
2. In Vercel, open the Mlezi project, Settings, Environment Variables. Check the
   **Production** values of `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` match that
   exact deployment. These URLs are public, unlike API secrets and deploy keys.
3. Verify what is actually deployed: open mlezicare.com, browser developer tools,
   Network, reload the workspace and find a Convex request or WebSocket. Its host
   must match the Convex Production deployment URL. Vercel environment edits take
   effect on a new frontend build, not the already published JavaScript.
4. A `dev:` entry in local `.env.local` identifies local CLI development selection;
   it does not prove which deployment a previously built live frontend uses.

Do not point the frontend at an empty production database. Existing accounts,
paid membership expiries, receipt records, identity files and authentication/MFA
configuration must be preserved through a separately planned cutover. Production
needs its own configured authentication, Resend, Turnstile, origins and M-Pesa
settings/callback. Never mix sandbox/test backends with live payments.

For automatic Vercel backend deploys, use a production `CONVEX_DEPLOY_KEY` scoped
to Vercel Production, root directory `frontend`, and the documented Convex build
command. Never prefix this private key with `VITE_`. Confirm the Vite URL injection
and this app's separate HTTP Actions URL before switching a live site.

## Backups and restoration

In the Convex dashboard, select the intended deployment and open **Backups**.
Use **Backup Now**, including file storage (profile pictures, private IDs/selfies).
Download a restricted copy and store it encrypted, separately from the app and
Git repository. Native automatic daily/weekly backups currently require Pro;
manual dashboard backups and CLI exports are available alternatives.

For an explicitly targeted production database-and-file export from `frontend`:

```sh
npx convex export --prod --include-file-storage --path /path/to/private-backup.zip
```

Choose a private folder and encrypt exports; they contain personal and identity
data. Do not commit them or upload them to public/shared folders. Backups do not
include code, deployment environment variables or scheduled functions. Preserve
code in Git and maintain protected recovery configuration separately. Restoring
MFA records requires the appropriate original encryption key.

Test recovery in a separate, isolated deployment with payment/email actions and
external access disabled. Use the backup's **Restore** action from that isolated
deployment's Backups page. A restore replaces destination database contents:
never test over the live database. Verify account/profile counts, membership
expiries, receipt uniqueness and file access without charging or emailing users.
Reapply deletion requests and payment updates after a real rollback so deleted
accounts are not resurrected and receipt reuse/duplicate charges are prevented.
Only mark `BACKUP_RESTORE_TESTED=true` after documenting a successful drill.

Sources:
- https://docs.convex.dev/production/hosting/vercel
- https://docs.convex.dev/database/backup-restore

## Account deletion and membership policy

New deletion requests restrict normal access immediately and schedule purge after
a two-hour cancellation window. Convex rejects cancellation after the deadline;
batched deletion may complete after the threshold. The retention sweep is a
fallback. Copies in backups and limited justified financial/audit records have
separate retention requirements; this is not a promise that every copy is erased
at exactly two hours.

Terms version 2026-11-04 states non-refundable membership fees for ordinary
change-of-mind/unused access and independent marketplace responsibility, while
preserving mandatory remedies and the operator's own platform obligations. The
text remains subject to qualified legal review; no legal approval is asserted.
