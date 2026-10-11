#!/usr/bin/env python3
"""Archive the exact clean Git release before deployment; never overwrite dated archives."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).strip():
    raise SystemExit('Commit the complete release before packaging; the checkout has changes.')
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-UTC')
destination = Path('/workspace/mpu-deliverables')
destination.mkdir(parents=True, exist_ok=True)
archive = destination / f'MPU-Release-{stamp}-{commit[:7]}.zip'
subprocess.run(['git', 'archive', '--format=zip', '--output=' + str(archive), commit], cwd=root, check=True)
manifest = {'preparedAtUTC': datetime.now(timezone.utc).isoformat(), 'commit': commit,
            'target': 'mpuwdc-dev', 'status': 'prepared-before-deployment'}
with zipfile.ZipFile(archive) as package:
    paths = package.namelist()
    if any('.env' in Path(p).name or '/node_modules/' in p or Path(p).name.endswith('.log') for p in paths):
        archive.unlink()
        raise SystemExit('Release archive contains an environment file, dependency directory or log.')
manifest['archive'] = archive.name
manifest['sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(archive)
