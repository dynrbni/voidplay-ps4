#!/usr/bin/env python3
"""Build a diagnostic with pinned OpenOrbis headers; no console access or installation."""
import json
import os
from pathlib import Path
import platform
import re
import subprocess
from urllib.parse import urlparse

root = Path(__file__).resolve().parent
build = root / 'build'
sdk = Path(os.environ.get('OO_PS4_TOOLCHAIN', ''))
llvm = Path(os.environ.get('LLVM_BIN', '/opt/homebrew/opt/llvm/bin'))
lld = Path(os.environ.get('LLD', '/opt/homebrew/opt/lld/bin/ld.lld'))
app_dir = os.environ.get('VP_APP_DIRECTORY', '')
target = os.environ.get('VP_STORAGE_TARGET', '/app0')
catalog = os.environ.get('VP_CATALOG_URL', '')
if not os.environ.get('OO_PS4_TOOLCHAIN') or not (sdk / 'lib/libc.a').is_file():
    raise SystemExit('Set OO_PS4_TOOLCHAIN to the extracted OpenOrbis v0.5.4 release, not its source checkout.')
if not (llvm / 'clang').is_file() or not lld.is_file():
    raise SystemExit('Non-Apple clang and ELF ld.lld required. Set LLVM_BIN and LLD.')
if 'Apple' in subprocess.check_output([str(llvm / 'clang'), '--version'], text=True):
    raise SystemExit('Apple clang is not supported for this target.')
for value in [app_dir, target]:
    if value and (len(value) > 200 or not re.fullmatch(r'/[a-zA-Z0-9_/-]+', value) or '..' in value):
        raise SystemExit('Use a simple absolute directory without traversal.')
if catalog:
    parsed = urlparse(catalog)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SystemExit('Catalog must be a public HTTPS URL without credentials, query or fragment.')
    if parsed.hostname in ['localhost', '127.0.0.1', '::1']:
        raise SystemExit('Use a public HTTPS catalog host.')
build.mkdir(exist_ok=True)
(build / 'config.h').write_text('\n'.join(f'#define {key} {json.dumps(value)}' for key, value in [('VP_APP_DIRECTORY', app_dir), ('VP_STORAGE_TARGET', target), ('VP_CATALOG_URL', catalog)]) + '\n')
flags = ['--target=x86_64-pc-freebsd12-elf', '-std=c11', '-D_GNU_SOURCE', '-fPIC', '-funwind-tables', '-fno-stack-protector', '-Wall', '-Wextra', '-Werror', '-isysroot', str(sdk), '-isystem', str(sdk / 'include'), '-I', str(build), '-c']
for source in ['common', 'main']:
    subprocess.run([str(llvm / 'clang'), *flags, str(root / f'{source}.c'), '-o', str(build / f'{source}.o')], check=True)
subprocess.run([str(lld), '-m', 'elf_x86_64', '-pie', '--script', str(sdk / 'link.x'), '--eh-frame-hdr', '-L', str(sdk / 'lib'), str(sdk / 'lib/crt1.o'), str(build / 'main.o'), str(build / 'common.o'), '-lc', '-lkernel', '-lSceSysmodule', '-lScePad', '-lSceUserService', '-lSceHttp', '-lSceSsl', '-lSceNet', '-lSceCommonDialog', '-lSceMsgDialog', '-o', str(build / 'diagnostic.elf')], check=True)
subdir = 'macos' if platform.system() == 'Darwin' else 'linux'
converter = sdk / 'bin' / subdir / ('create-fself-macos' if subdir == 'macos' else 'create-fself')
if not converter.exists():
    raise SystemExit(f'ELF built, but SELF converter is missing: {converter}')
subprocess.run([str(converter), '-in=' + str(build / 'diagnostic.elf'), '-out=' + str(build / 'diagnostic.oelf'), '--eboot', str(build / 'eboot.bin'), '--paid', '0x3800000000000011'], check=True)
print('ELF and eboot built. No firmware or console capability verified. Run package.py to create a test PKG.')
