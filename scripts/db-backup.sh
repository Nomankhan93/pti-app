#!/usr/bin/env bash
set -euo pipefail
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
[[ -n "$DB_URL" ]] || { echo 'Set SUPABASE_DB_URL or DATABASE_URL to a direct Postgres connection string.' >&2; exit 2; }
command -v pg_dump >/dev/null 2>&1 || { echo 'pg_dump is required. Install the PostgreSQL client tools first.' >&2; exit 2; }

mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PREFIX="${BACKUP_PREFIX:-backups/pti-${STAMP}}"
DUMP="${PREFIX}.dump"
SCHEMA="${PREFIX}-schema.sql"

echo 'Creating encrypted-in-transit Postgres backup via supplied connection URL...'
pg_dump "$DB_URL" --format=custom --no-owner --no-acl --file="$DUMP"
pg_dump "$DB_URL" --schema-only --no-owner --no-acl --file="$SCHEMA"

if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --list "$DUMP" >/dev/null
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$DUMP" "$SCHEMA" > "${PREFIX}.sha256"
fi

chmod 600 "$DUMP" "$SCHEMA" "${PREFIX}.sha256" 2>/dev/null || true
echo "Backup complete: $DUMP"
echo "Schema snapshot: $SCHEMA"
echo 'Keep backups outside the Git repository and test restore regularly.'
