#!/usr/bin/env bash
set -euo pipefail
ARCHIVE="${1:-}"
[[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || { echo "Usage: $0 <archive.zip>" >&2; exit 2; }
python3 - "$ARCHIVE" <<'PY'
import re,sys,zipfile
archive=sys.argv[1]
forbidden=[
 re.compile(r'(^|/)\.git/'), re.compile(r'(^|/)node_modules/'),
 re.compile(r'(^|/)\.env($|\.)'), re.compile(r'(^|/)backups/'),
 re.compile(r'(^|/)exports/'), re.compile(r'(^|/)supabase/\.temp/'),
 re.compile(r'(^|/)supabase/\.branches/'), re.compile(r'(^|/)supabase/snippets/'),
]
with zipfile.ZipFile(archive) as z:
    names=z.namelist()
    bad=[n for n in names if any(rx.search(n) for rx in forbidden)]
    if bad:
        print('Unsafe archive entries:',file=sys.stderr)
        for n in bad[:100]: print(' ',n,file=sys.stderr)
        sys.exit(1)
print(f'Archive safety check: PASS ({len(names)} entries)')
PY
