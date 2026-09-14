#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"

bash scripts/verify-project.sh "$ROOT"
bash scripts/scan-secrets.sh "$ROOT"

python3 - <<'PY'
from pathlib import Path
import json,sys
p=json.loads(Path('package.json').read_text())
required=['check','test','build','security:audit:prod','test:e2e:release','db:backup','db:restore-drill','qa:release']
missing=[x for x in required if x not in p.get('scripts',{})]
if missing:
    print('Missing release scripts: '+', '.join(missing),file=sys.stderr);sys.exit(1)
config=Path('supabase/config.toml').read_text()
checks={
 'minimum_password_length = 8':'Local Supabase minimum password length',
 'secure_password_change = true':'Secure password changes',
 'sign_in_sign_ups = 20':'Auth sign-in/signup rate limit',
 'max_frequency = "60s"':'Email resend minimum interval',
}
for needle,label in checks.items():
    if needle not in config:
        print(f'Production config baseline missing: {label}',file=sys.stderr);sys.exit(1)
print('Production configuration baseline: PASS')
PY

echo 'Production readiness static gate: PASS'
echo 'Reminder: hosted Auth leaked-password protection, SMTP/CAPTCHA, backups/PITR and alerting are dashboard/provider settings and must be verified separately.'
