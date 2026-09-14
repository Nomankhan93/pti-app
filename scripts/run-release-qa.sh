#!/usr/bin/env bash
set -euo pipefail
DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
[[ -n "$DB_URL" ]] || { echo 'Set DATABASE_URL or SUPABASE_DB_URL.' >&2; exit 2; }
command -v psql >/dev/null 2>&1 || { echo 'psql is required.' >&2; exit 2; }
for sql in \
  supabase/qa/production-security-rls-audit.sql \
  supabase/qa/finance-ledger-integrity.sql \
  supabase/qa/production-release-gate.sql \
  supabase/qa/final-gap-closure-release-candidate.sql; do
  echo "==> $sql"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$sql"
done
