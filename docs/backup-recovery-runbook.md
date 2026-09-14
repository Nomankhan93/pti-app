# PTI Backup & Recovery Runbook

## Objective

A backup is only useful after a successful restore test. The production process therefore has two separate actions: create/verify a backup, then periodically restore that backup into a disposable database and run release QA.

## 1. Create a backup

Use a direct Postgres connection string supplied through an environment variable; do not place it in shell history, source files or Git.

```bash
export SUPABASE_DB_URL='postgresql://...'
npm run db:backup
unset SUPABASE_DB_URL
```

The script creates a custom-format database dump, a schema-only SQL snapshot and a SHA-256 manifest under `backups/`. That directory is ignored by Git and safe exports.

Move production backups to an encrypted, access-controlled backup location. Local project storage is not the final backup destination.

## 2. Verify backup readability

`db-backup.sh` runs `pg_restore --list` when available. Also retain the generated checksum manifest with the backup.

## 3. Restore drill

Create a disposable local/staging Postgres database. Never use the production connection URL.

```bash
export RESTORE_DATABASE_URL='postgresql://localhost/...'
export ALLOW_RESTORE_DRILL=YES
npm run db:restore-drill -- backups/pti-YYYYMMDDTHHMMSSZ.dump
unset RESTORE_DATABASE_URL ALLOW_RESTORE_DRILL
```

For a remote disposable target, an additional `ALLOW_REMOTE_RESTORE_DRILL=YES` guard is required.

## 4. Validate restored data

Run:

```bash
export DATABASE_URL='postgresql://localhost/...'
npm run qa:release
unset DATABASE_URL
```

Then test application login and representative member, volunteer, operations, attendance, finance, leadership and notification flows against the restored environment.

## 5. Recovery decision record

For every real recovery, record:

- incident start time;
- selected backup timestamp;
- expected recovery point/data-loss window;
- restore target;
- migration/version applied after restore;
- release QA result;
- application smoke-test result;
- time production traffic resumed.

Do not overwrite or delete the incident evidence/audit trail during recovery.
