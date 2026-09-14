#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

python3 - <<'PY'
from __future__ import annotations
import os, re, sys
from pathlib import Path

root = Path.cwd()
exclude_dirs = {'.git','node_modules','.output','dist','dist-ssr','.tanstack','.nitro','.vinxi','.wrangler','backups','exports','.patch-backups','supabase/.temp','supabase/.branches','supabase/snippets'}
text_ext = {'.ts','.tsx','.js','.mjs','.cjs','.json','.md','.sql','.toml','.yaml','.yml','.sh','.css','.html','.txt','.example'}
patterns = [
    ('Supabase secret key', re.compile(r'\bsb_secret_[A-Za-z0-9_-]{16,}\b')),
    ('Private key', re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')),
    ('Credentialed Postgres URL', re.compile(r'postgres(?:ql)?://[^\s:/]+:[^\s@]{8,}@[^\s/]+', re.I)),
    ('Service role assignment', re.compile(r'\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*["\']?(?!your-|placeholder|changeme|example)[^\s"\']{20,}', re.I)),
]

hits=[]
for path in root.rglob('*'):
    if not path.is_file():
        continue
    rel = path.relative_to(root).as_posix()
    parts = rel.split('/')
    if any('/'.join(parts[:i+1]) in exclude_dirs or parts[i] in exclude_dirs for i in range(len(parts))):
        continue
    if path.name.startswith('.env') and path.name != '.env.example':
        hits.append((rel,0,'Local environment file present in scan scope'))
        continue
    if path.stat().st_size > 2_000_000:
        continue
    if path.suffix.lower() not in text_ext and path.name not in {'Dockerfile','Procfile'}:
        continue
    try:
        text=path.read_text(errors='ignore')
    except Exception:
        continue
    for label,rx in patterns:
        for m in rx.finditer(text):
            line=text.count('\n',0,m.start())+1
            snippet=m.group(0)[:80]
            hits.append((rel,line,f'{label}: {snippet}'))

if hits:
    print('Secret scan FAILED:', file=sys.stderr)
    for rel,line,msg in hits:
        print(f'  {rel}:{line}: {msg}', file=sys.stderr)
    sys.exit(1)
print('Secret scan: PASS')
PY
