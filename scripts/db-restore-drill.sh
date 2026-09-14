#!/usr/bin/env bash
set -euo pipefail
DUMP="${1:-}"
TARGET="${RESTORE_DATABASE_URL:-}"
[[ -f "$DUMP" ]] || { echo "Usage: RESTORE_DATABASE_URL=... ALLOW_RESTORE_DRILL=YES $0 <backup.dump>" >&2; exit 2; }
[[ -n "$TARGET" ]] || { echo 'RESTORE_DATABASE_URL is required.' >&2; exit 2; }
[[ "${ALLOW_RESTORE_DRILL:-NO}" == 'YES' ]] || { echo 'Refusing restore. Set ALLOW_RESTORE_DRILL=YES after verifying the target is disposable.' >&2; exit 2; }
if [[ -n "${SUPABASE_DB_URL:-}" && "$TARGET" == "$SUPABASE_DB_URL" ]]; then
  echo 'Refusing restore drill against SUPABASE_DB_URL/production target.' >&2; exit 3
fi
if [[ "$TARGET" != *localhost* && "$TARGET" != *127.0.0.1* && "${ALLOW_REMOTE_RESTORE_DRILL:-NO}" != 'YES' ]]; then
  echo 'Remote restore drills require ALLOW_REMOTE_RESTORE_DRILL=YES.' >&2; exit 3
fi
command -v pg_restore >/dev/null 2>&1 || { echo 'pg_restore is required.' >&2; exit 2; }
command -v psql >/dev/null 2>&1 || { echo 'psql is required.' >&2; exit 2; }

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$TARGET" "$DUMP"
psql "$TARGET" -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('public.members') as members,
       to_regclass('public.donations') as donations,
       to_regclass('public.notification_messages') as notifications,
       to_regclass('public.production_export_audit') as production_exports;
SQL

echo 'Restore drill: PASS'
