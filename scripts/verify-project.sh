#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"

required=(
  package.json package-lock.json .gitignore .zipignore .nvmrc
  supabase/config.toml
  supabase/migrations/20260914050000_pti_production_hardening.sql
  supabase/migrations/20260914060000_pti_final_gap_closure_release_candidate.sql
  supabase/qa/production-security-rls-audit.sql
  supabase/qa/finance-ledger-integrity.sql
  supabase/qa/production-release-gate.sql
  supabase/qa/final-gap-closure-release-candidate.sql
  scripts/scan-secrets.sh scripts/safe-export.sh scripts/check-safe-archive.sh
  scripts/db-backup.sh scripts/db-restore-drill.sh scripts/e2e-release-smoke.mjs
  scripts/verify-release-candidate.sh .env.example vercel.json
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "Missing required file: $f" >&2; exit 1; }
done

[[ "$(tr -d '[:space:]' < .nvmrc)" == "24" ]] || { echo '.nvmrc must pin Node 24' >&2; exit 1; }

python3 - <<'PY'
from pathlib import Path
import re,sys,json
root=Path.cwd()
migrations=sorted((root/'supabase/migrations').glob('*.sql'))
stamps=[]
for p in migrations:
    m=re.match(r'^(\d{14})_',p.name)
    if not m:
        print(f'Invalid migration filename: {p.name}',file=sys.stderr);sys.exit(1)
    stamps.append(m.group(1))
if len(stamps)!=len(set(stamps)):
    print('Duplicate migration timestamp detected',file=sys.stderr);sys.exit(1)
phase7=(root/'supabase/migrations/20260914040000_pti_notifications_command_center.sql').read_text()
if 'select distinct ou.id, ou.parent_id, ou.level, ou.name, ou.code' in phase7:
    print('Phase 7 DISTINCT/ORDER BY defect is still present',file=sys.stderr);sys.exit(1)
pkg=json.loads((root/'package.json').read_text())
for name in ['release:check','security:audit:prod','verify:production','verify:release-candidate','scan:secrets','db:backup','db:restore-drill','test:e2e:release']:
    if name not in pkg.get('scripts',{}):
        print(f'Missing package script: {name}',file=sys.stderr);sys.exit(1)
print(f'Migration chain: PASS ({len(migrations)} files, latest {migrations[-1].name})')
PY

if command -v git >/dev/null 2>&1 && [[ -d .git ]]; then
  bad="$(git ls-files | grep -E '(^|/)\.env($|\.)|(^|/)node_modules/|(^|/)backups/|(^|/)exports/' || true)"
  [[ -z "$bad" ]] || { echo "Unsafe tracked files:" >&2; echo "$bad" >&2; exit 1; }
fi

echo 'Project structure verification: PASS'
