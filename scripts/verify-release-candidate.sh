#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"

required=(
  .env.example vercel.json public/manifest.json public/sw.js
  src/lib/auth/password-policy.ts src/lib/auth/password-policy.test.ts
  src/lib/admin/access.ts
  supabase/migrations/20260914060000_pti_final_gap_closure_release_candidate.sql
  supabase/qa/final-gap-closure-release-candidate.sql
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "Release candidate missing required file: $f" >&2; exit 1; }
done

[[ ! -e public/site.webmanifest ]] || { echo 'Legacy public/site.webmanifest must be removed; manifest.json is canonical.' >&2; exit 1; }

python3 - <<'PY'
from pathlib import Path
import json,re,sys

migration=Path('supabase/migrations/20260914060000_pti_final_gap_closure_release_candidate.sql').read_text()
checks={
  'member verification token':'public_verify_token',
  'designation update lock':'new.designation is distinct from old.designation',
  'designation insert reset':'new.designation := null',
  'photo path ownership':'Member photo must be uploaded inside your member storage folder.',
  'canonical admin helper':'can_manage_membership_admin',
  'verification budget':'consume_public_verification_budget',
  'masked member export':'production_export_members_impl',
  'finance recorder/verifier separation':'donation recorder cannot verify',
  'finance verifier/reconciler separation':'verifier and reconciler must be different users',
}
for label,needle in checks.items():
    if needle not in migration:
        print(f'Release candidate contract missing: {label}',file=sys.stderr);sys.exit(1)

verify=Path('src/lib/verify/actions.ts').read_text()
if "eq('member_no'" in verify or ".eq(\"member_no\"" in verify:
    print('Public verifier still queries predictable member_no',file=sys.stderr);sys.exit(1)
if "eq('public_verify_token'" not in verify:
    print('Public verifier does not query public_verify_token',file=sys.stderr);sys.exit(1)
if 'consume_public_verification_budget' not in verify:
    print('Public verifier is missing the verification budget',file=sys.stderr);sys.exit(1)

for f in ['src/routes/card.tsx','src/routes/dashboard.tsx','src/routes/admin/members/$id/card.tsx']:
    text=Path(f).read_text()
    if 'public_verify_token' not in text:
        print(f'{f} is not using the random verification token',file=sys.stderr);sys.exit(1)

register=Path('src/routes/register.tsx').read_text()
if 'localStorage.setItem' in register or 'localStorage.getItem' in register:
    print('Registration draft still persists sensitive data in localStorage',file=sys.stderr);sys.exit(1)
if 'sessionStorage' not in register:
    print('Registration draft is not tab-scoped',file=sys.stderr);sys.exit(1)

signup=Path('src/routes/signup.tsx').read_text()
login=Path('src/routes/login.tsx').read_text()
if 'signUp({\n      phone:' in signup or "signInWithPassword({ phone" in login:
    print('Phone auth remains exposed without an enabled SMS provider',file=sys.stderr);sys.exit(1)
if 'resetPasswordForEmail' not in login or 'updateUser({ password' not in login:
    print('Password recovery/reset flow is incomplete',file=sys.stderr);sys.exit(1)

src='\n'.join(p.read_text(errors='ignore') for p in Path('src').rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx'})
for needle in ["language === 'sd'",'sd-PK',"code: 'sd'"]:
    if needle in src:
        print(f'Sindhi runtime branch remains: {needle}',file=sys.stderr);sys.exit(1)

sw=Path('public/sw.js').read_text()
if '/site.webmanifest' in sw or '/manifest.json' not in sw:
    print('Service worker manifest cache is not canonical',file=sys.stderr);sys.exit(1)
if "addEventListener('push'" not in sw or "addEventListener('notificationclick'" not in sw:
    print('Service worker push-display handlers missing',file=sys.stderr);sys.exit(1)

env=Path('.env.example').read_text()
for key in ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']:
    if key not in env:
        print(f'.env.example missing {key}',file=sys.stderr);sys.exit(1)

vercel=Path('vercel.json').read_text()
for header in ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','Permissions-Policy']:
    if header not in vercel:
        print(f'vercel.json missing security header {header}',file=sys.stderr);sys.exit(1)

pkg=json.loads(Path('package.json').read_text())
for dep,version in pkg.get('dependencies',{}).items():
    if version == 'latest':
        print(f'Unpinned runtime dependency remains: {dep}',file=sys.stderr);sys.exit(1)
for dep,version in pkg.get('devDependencies',{}).items():
    if version == 'latest':
        print(f'Unpinned dev dependency remains: {dep}',file=sys.stderr);sys.exit(1)
if pkg.get('engines',{}).get('node') != '>=24 <25':
    print('Node release line is not pinned to Node 24',file=sys.stderr);sys.exit(1)

print('Release-candidate security/static contracts: PASS')
PY
