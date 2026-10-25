#!/usr/bin/env python3
"""Package the built diagnostic; this never uploads or installs it."""
import os
from pathlib import Path
import platform
import subprocess
import shutil
import hashlib
import json
from artifact_contract import runtime_sources, validate_manifest, validate_build_receipt
root = Path(__file__).resolve().parent
build = root / 'build'
sdk = Path(os.environ.get('OO_PS4_TOOLCHAIN', ''))
subdir = 'macos' if platform.system() == 'Darwin' else 'linux'
packer = sdk / 'bin' / subdir / 'PkgTool.Core'
gp4 = sdk / 'bin' / subdir / 'create-gp4'
if not (build / 'eboot.bin').is_file() or not packer.is_file():
    raise SystemExit('Build the eboot and configure OO_PS4_TOOLCHAIN first.')
validate_build_receipt(build, root)
sources = runtime_sources(sdk)
for name, source in sources.items():
    target = build / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
content = 'IV0000-VPLY00001_00-VOIDPLAYDIAG0001'
(build / 'sce_sys').mkdir(exist_ok=True)
sfo = 'sce_sys/param.sfo'
def run(args): subprocess.run([str(packer), *args], cwd=build, check=True)
run(['sfo_new', sfo])
entries = {'APP_TYPE': ('Integer', '4', '1'), 'APP_VER': ('Utf8', '8', '01.01'), 'ATTRIBUTE': ('Integer', '4', '0'), 'CATEGORY': ('Utf8', '4', 'gd'), 'CONTENT_ID': ('Utf8', '48', content), 'DOWNLOAD_DATA_SIZE': ('Integer', '4', '0'), 'SYSTEM_VER': ('Integer', '4', '0'), 'TITLE': ('Utf8', '128', 'Voidplay Diagnostic (Experimental)'), 'TITLE_ID': ('Utf8', '12', 'VPLY00001'), 'VERSION': ('Utf8', '8', '01.01')}
for key, (kind, size, value) in entries.items(): run(['sfo_setentry', sfo, key, '--type', kind, '--maxsize', size, '--value', value])
# The icon derives from original repository artwork and is generated only in ignored build output.
artwork = root.parent.parent / 'public/art/orbit-workshop-hero.webp'
if platform.system() == 'Darwin':
    subprocess.run(['sips', '-s', 'format', 'png', '-z', '512', '512', str(artwork), '--out', str(build / 'sce_sys/icon0.png')], check=True, stdout=subprocess.DEVNULL)
files = ' '.join(['eboot.bin', 'sce_sys/param.sfo', 'sce_sys/icon0.png', *sources])
subprocess.run([str(gp4), '-out', 'pkg.gp4', '--content-id=' + content, '--files', files], cwd=build, check=True)
validate_manifest(build / 'pkg.gp4', build)
run(['pkg_build', 'pkg.gp4', '.'])
package = build / (content + '.pkg')
receipt = {'version': '01.01', 'sha256': hashlib.sha256(package.read_bytes()).hexdigest(), 'bytes': package.stat().st_size, 'inputs': {name: hashlib.sha256((build / name).read_bytes()).hexdigest() for name in files.split()}}
(build / 'package-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('Experimental PKG built. FTP transfer alone does not install or launch it.')
