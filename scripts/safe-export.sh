#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
mkdir -p exports
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${2:-exports/pti-app-safe-${STAMP}.zip}"

python3 - "$OUT" <<'PY'
from pathlib import Path
from fnmatch import fnmatch
import sys,zipfile
root=Path.cwd(); out=Path(sys.argv[1]).resolve()
patterns=[]
for raw in (root/'.zipignore').read_text().splitlines():
    s=raw.strip()
    if s and not s.startswith('#'): patterns.append(s)

def excluded(rel:str)->bool:
    rel=rel.replace('\\','/')
    for p in patterns:
        p=p.replace('\\','/')
        if p.endswith('/'):
            d=p.rstrip('/')
            if rel==d or rel.startswith(d+'/'): return True
        if fnmatch(rel,p) or fnmatch('/'+rel,'*/'+p): return True
        if '/' not in p and fnmatch(Path(rel).name,p): return True
    return False

out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for path in sorted(root.rglob('*')):
        if not path.is_file(): continue
        if path.resolve()==out: continue
        rel=path.relative_to(root).as_posix()
        if excluded(rel): continue
        z.write(path,rel)
print(out)
PY

bash scripts/check-safe-archive.sh "$OUT"
echo "Safe project export created: $OUT"
