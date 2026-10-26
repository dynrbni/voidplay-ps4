#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Separate native Mac preview and experimental PS4 boot workflows."""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

from artifacts import sha256, validate_elf, validate_self, read_sfo, verify_receipt, write_receipt

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
BUILD = ROOT / 'build'
LOCK = json.loads((ROOT / 'dependencies.lock.json').read_text())
CONTENT = 'IV0000-VPLY00002_00-VOIDPLAYBOOT0001'
APP_VERSION = '01.01'
PACKAGE = BUILD / 'ps4-boot' / (CONTENT + '.pkg')


def run(args, cwd=ROOT, log=None):
    result = subprocess.run([str(x) for x in args], cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if log:
        with log.open('a') as out:
            out.write(shlex.join(str(x) for x in args) + '\n' + result.stdout)
    if result.returncode:
        raise RuntimeError(f'Command failed ({result.returncode}): {args[0]}\n{result.stdout}')
    return result.stdout


def executable(name):
    value = shutil.which(name)
    if not value:
        raise ValueError(f'Missing dependency: {name}. See framework/voidplay-native/README.md.')
    return Path(value).resolve()


def sdk():
    value = os.environ.get('OO_PS4_TOOLCHAIN')
    if not value:
        raise ValueError('Set OO_PS4_TOOLCHAIN to the complete extracted OpenOrbis v0.5.4 release.')
    return Path(value).expanduser().resolve()


def ps4_environment():
    root = sdk()
    for name, expected in LOCK['openorbis']['files'].items():
        path = root / name
        if not path.is_file() or sha256(path) != expected:
            raise ValueError(f'Wrong/incomplete OpenOrbis release input: {name}')
    llvm = Path(os.environ.get('LLVM18_BIN', '/opt/homebrew/opt/llvm@18/bin'))
    compiler, linker = llvm / 'clang++', llvm / 'ld.lld'
    for tool in [compiler, linker]:
        version = run([tool, '--version']).splitlines()[0]
        if not re.search(r'\b18\.\d+\.\d+', version) or 'Apple' in version:
            raise ValueError(f'Requires LLVM/LLD 18, found {version}')
    subdir = 'macos' if platform.system() == 'Darwin' else 'linux'
    converter = root / 'bin' / subdir / ('create-fself-macos' if subdir == 'macos' else 'create-fself')
    packer = root / 'bin' / subdir / 'PkgTool.Core'
    gp4 = root / 'bin' / subdir / 'create-gp4'
    for tool in [converter, packer, gp4]:
        if not tool.is_file() or not os.access(tool, os.X_OK):
            raise ValueError(f'Missing executable SDK tool: {tool}')
    return root, compiler, linker, converter, packer, gp4


def native_sources():
    return sorted([*ROOT.glob('include/**/*.hpp'), *ROOT.glob('native/**/*.cpp'),
                   *ROOT.glob('tools/*.py'), ROOT / 'dependencies.lock.json'])


def source_context():
    paths = [str(p.relative_to(REPO)) for p in native_sources()]
    return {'source_commit': run(['git', 'rev-parse', 'HEAD'], cwd=REPO).strip(),
            'native_sources_dirty': bool(run(['git', 'status', '--porcelain', '--untracked-files=all', '--', *paths], cwd=REPO).strip())}


@contextlib.contextmanager
def build_guard():
    BUILD.mkdir(exist_ok=True)
    with (BUILD / '.lock').open('a') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise ValueError('Another native command is active; wait for it to finish.')
        yield


def build_dependencies(directory):
    contents = (directory / 'boot.d').read_text().replace('\\\n', '')
    return [Path(name) for name in shlex.split(contents.split(':', 1)[1])]


def mac_environment():
    if platform.system() != 'Darwin':
        raise ValueError('The desktop preview is currently qualified only on macOS.')
    compiler = executable(os.environ.get('CXX', 'clang++'))
    sdl = executable('sdl2-config')
    version = run([sdl, '--version']).strip()
    if not version.startswith('2.'):
        raise ValueError(f'SDL2 required, found {version}')
    flags = shlex.split(run([sdl, '--cflags', '--libs']))
    return compiler, sdl, flags


def doctor():
    failed = False
    for name, check in [('mac', mac_environment), ('ps4', ps4_environment)]:
        try:
            values = check()
            print(f'{name}: environment PASS')
            print('  ' + run([values[0] if name == 'mac' else values[1], '--version']).splitlines()[0])
            if name == 'mac': print('  SDL ' + run([values[1], '--version']).strip())
            else: print(f"  OpenOrbis {LOCK['openorbis']['version']}: {len(LOCK['openorbis']['files'])} pinned files match")
        except (ValueError, RuntimeError, OSError) as error:
            failed = True
            print(f'{name}: environment FAIL: {error}')
    print('Hardware: unverified. Doctor neither contacts nor launches the console.')
    if failed: raise ValueError('Environment incomplete; see the failures above.')


def mac_build():
    directory = BUILD / 'mac'
    directory.mkdir(parents=True, exist_ok=True)
    receipt = directory / 'receipt.json'
    receipt.unlink(missing_ok=True)
    compiler, sdl, flags = mac_environment()
    binary = directory / 'VoidplayNative'
    run([compiler, '-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', '-I', ROOT / 'include',
         ROOT / 'native/shared/scene.cpp', ROOT / 'native/desktop/main.cpp', *flags, '-o', binary], log=directory / 'build.log')
    write_receipt(receipt, [*native_sources(), compiler, sdl], [binary],
                  {'target': 'mac', **source_context(), 'compiler': run([compiler, '--version']), 'sdl': run([sdl, '--version']).strip()})
    print(f'Mac native preview built: {binary}')
    return binary


def test():
    directory = BUILD / 'tests'
    directory.mkdir(parents=True, exist_ok=True)
    compiler, _, _ = mac_environment()
    binary = directory / 'scene-test'
    run([compiler, '-std=c++17', '-g', '-Wall', '-Wextra', '-Werror', '-fsanitize=address,undefined',
         '-fno-omit-frame-pointer', '-I', ROOT / 'include', ROOT / 'native/shared/scene.cpp',
         ROOT / 'tests/scene_test.cpp', '-o', binary], log=directory / 'build.log')
    print(run([binary]).strip())
    print(run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s', ROOT / 'tests', '-p', 'test_*.py']).strip())


def ps4_inputs(environment):
    root, compiler, linker, converter, packer, gp4 = environment
    return [*native_sources(), *[root / p for p in LOCK['openorbis']['files']],
            compiler, linker, converter, packer, gp4, REPO / 'public/art/orbit-workshop-hero.webp']


def validate_package(packer, log=None):
    result = run([packer, 'pkg_validate', '--verbose', PACKAGE], log=log)
    expected = ['PFS Image Digest', 'Body Digest', 'PKG Header Digest', 'PKG Header Signature', 'Debug RIF Signature']
    passed = [line for line in result.splitlines() if line.startswith('[OK]')]
    if 'FAIL' in result.upper() or 'ERROR' in result.upper() or any(not any(name in line for line in passed) for name in expected):
        raise ValueError('Package validation incomplete or failed; inspect build.log.')


def verify_extracted(packer, directory, log=None):
    with tempfile.TemporaryDirectory(prefix='voidplay-pkg-') as extracted:
        root = Path(extracted)
        run([packer, 'pkg_extract', PACKAGE, root], log=log)
        for name in ['eboot.bin', 'sce_sys/about/right.sprx', 'sce_module/libc.prx', 'sce_module/libSceFios2.prx']:
            if sha256(root / 'uroot' / name) != sha256(directory / name):
                raise ValueError(f'Packaged file does not match: {name}')
        listing = run([packer, 'pkg_listentries', PACKAGE], log=log)
        for name, target in [('PARAM_SFO', 'sce_sys/param.sfo'), ('ICON0_PNG', 'sce_sys/icon0.png')]:
            rows = [line.split() for line in listing.splitlines() if line.split() and line.split()[-1] == name]
            if len(rows) != 1 or len(rows[0]) < 5 or not rows[0][3].isdigit():
                raise ValueError(f'Cannot locate package metadata: {name}')
            output = root / name
            # This SDK tool accepts the table index, despite calling it entry_id in its help.
            run([packer, 'pkg_extractentry', PACKAGE, rows[0][3], output], log=log)
            if not output.is_file(): raise ValueError(f'Missing packaged metadata: {name}')
            if name == 'PARAM_SFO':
                expected, actual = read_sfo(directory / target), read_sfo(output)
                # PkgTool adds publication-tool metadata to SFO while building the PKG.
                if any(actual.get(key) != value for key, value in expected.items()) or set(actual) - set(expected) != {'PUBTOOLINFO', 'PUBTOOLVER'}:
                    raise ValueError('Packager altered application SFO metadata.')
                packaged_sfo = output.read_bytes()
            elif sha256(output) != sha256(directory / target):
                raise ValueError(f'Packaged metadata does not match: {name}')
        return packaged_sfo


def ps4_build():
    directory = BUILD / 'ps4-boot'
    directory.mkdir(parents=True, exist_ok=True)
    receipt = directory / 'receipt.json'
    receipt.unlink(missing_ok=True)
    environment = ps4_environment()
    root, compiler, linker, converter, packer, gp4 = environment
    inputs = ps4_inputs(environment)
    identity = hashlib.sha256(''.join(sha256(p) for p in inputs).encode()).hexdigest()[:16]
    config = directory / 'build_id.h'
    config.write_text(f'#define VP_BUILD_ID "{identity}"\n')
    log = directory / 'build.log'
    log.write_text('C++ boot test; no hardware verification.\n')
    obj, elf, oelf, eboot = [directory / name for name in ('boot.o', 'boot.elf', 'boot.oelf', 'eboot.bin')]
    run([compiler, '--target=x86_64-pc-freebsd12-elf', '-std=c++17', '-O1', '-fPIC', '-funwind-tables',
         '-fno-stack-protector', '-fno-exceptions', '-fno-rtti', '-Wall', '-Wextra', '-Werror',
         '-isysroot', root, '-isystem', root / 'include', '-I', directory,
         '-MD', '-MF', directory / 'boot.d', '-c', ROOT / 'native/ps4/boot.cpp', '-o', obj], log=log)
    inputs = sorted(set([*inputs, *build_dependencies(directory)]))
    run([linker, '-m', 'elf_x86_64', '-pie', '--no-rosegment', '-z', 'max-page-size=0x4000',
         '-z', 'common-page-size=0x4000', '--script', root / 'link.x', '--eh-frame-hdr',
         '-L', root / 'lib', root / 'lib/crt1.o', obj, '-lc', '-lkernel', '-o', elf], log=log)
    validate_elf(elf)
    run([converter, '-in=' + str(elf), '-out=' + str(oelf), '--eboot', eboot, '--paid', '0x3800000000000011'], log=log)
    validate_self(eboot)
    files = ['eboot.bin', 'sce_sys/param.sfo', 'sce_sys/icon0.png', 'sce_sys/about/right.sprx',
             'sce_module/libc.prx', 'sce_module/libSceFios2.prx']
    for name in files[3:]:
        target = directory / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / 'samples/hello_world' / name, target)
    sfo = directory / files[1]
    sfo.parent.mkdir(exist_ok=True)
    run([packer, 'sfo_new', sfo], log=log)
    entries = {
        'APP_TYPE': ('Integer', '4', '1'), 'APP_VER': ('Utf8', '8', APP_VERSION),
        'ATTRIBUTE': ('Integer', '4', '0'), 'CATEGORY': ('Utf8', '4', 'gd'),
        'CONTENT_ID': ('Utf8', '48', CONTENT), 'DOWNLOAD_DATA_SIZE': ('Integer', '4', '0'),
        'SYSTEM_VER': ('Integer', '4', '0'), 'TITLE': ('Utf8', '128', 'Voidplay C++ Boot Test'),
        'TITLE_ID': ('Utf8', '12', 'VPLY00002'), 'VERSION': ('Utf8', '8', APP_VERSION),
    }
    for key, (kind, size, value) in entries.items():
        run([packer, 'sfo_setentry', sfo, key, '--type', kind, '--maxsize', size, '--value', value], log=log)
    if platform.system() != 'Darwin':
        raise ValueError('Icon preparation currently requires macOS sips; no package receipt generated.')
    run(['sips', '-s', 'format', 'png', '-z', '512', '512', REPO / 'public/art/orbit-workshop-hero.webp', '--out', directory / files[2]], log=log)
    run([gp4, '-out', 'pkg.gp4', '--content-id=' + CONTENT, '--files', ' '.join(files)], cwd=directory, log=log)
    run([packer, 'pkg_build', 'pkg.gp4', '.'], cwd=directory, log=log)
    validate_package(packer, log)
    (directory / 'packaged-param.sfo').write_bytes(verify_extracted(packer, directory, log))
    outputs = [elf, oelf, eboot, config, directory / 'boot.d', directory / 'pkg.gp4', directory / 'packaged-param.sfo', PACKAGE, *[directory / p for p in files[1:]]]
    write_receipt(receipt, inputs, outputs, {'target': 'ps4-boot', 'build_id': identity, **source_context(),
        'version': APP_VERSION, 'title_id': 'VPLY00002', 'compiler': run([compiler, '--version']),
        'linker': run([linker, '--version']), 'package_bytes': PACKAGE.stat().st_size,
        'imports': ['libc/kernel via OpenOrbis CRT'], 'console_launch': 'unverified', 'firmware_12_00': 'unverified'})
    (directory / 'package.sha256').write_text(f'{sha256(PACKAGE)}  {PACKAGE.name}\n')
    print(f'PS4 boot experiment built and extracted-byte verified: {PACKAGE}\nSHA256 {sha256(PACKAGE)}\nHardware launch NOT verified.')


def ps4_verify():
    environment = ps4_environment()
    directory = PACKAGE.parent
    receipt = verify_receipt(directory / 'receipt.json', [*ps4_inputs(environment), *build_dependencies(directory)],
                             [PACKAGE, directory / 'boot.elf', directory / 'eboot.bin'])
    validate_elf(directory / 'boot.elf')
    validate_self(directory / 'eboot.bin')
    validate_package(environment[4])
    verify_extracted(environment[4], directory)
    print(f"Artifact verification PASS, build {receipt['metadata']['build_id']}; hardware remains unverified.")
    return receipt


def watch(args):
    process = None
    signature = None
    try:
        while True:
            current = [(str(p), p.stat().st_mtime_ns) for p in native_sources()]
            if current != signature:
                signature = current
                if process and process.poll() is None:
                    process.terminate()
                    try: process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                try:
                    binary = mac_build()
                    process = subprocess.Popen([str(binary), *args], cwd=ROOT)
                except (RuntimeError, ValueError, OSError) as error:
                    print(f'Watch build failed: {error}\nWaiting for another source change.', file=sys.stderr)
            time.sleep(0.5)
    finally:
        if process and process.poll() is None:
            process.terminate()
            process.wait(timeout=3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['doctor', 'mac-build', 'mac-run', 'mac-watch', 'test', 'mac-smoke', 'ps4-build', 'ps4-verify'])
    options, remaining = parser.parse_known_args()
    if remaining and remaining[0] == '--': remaining = remaining[1:]
    if remaining and options.command not in ['mac-run', 'mac-watch']:
        parser.error('Only mac-run/mac-watch accept preview arguments.')
    with build_guard():
        if options.command == 'doctor': doctor()
        elif options.command == 'mac-build': mac_build()
        elif options.command == 'test': test()
        elif options.command == 'ps4-build': ps4_build()
        elif options.command == 'ps4-verify': ps4_verify()
        elif options.command == 'mac-run':
            binary = mac_build()
            subprocess.run([str(binary), *remaining], cwd=ROOT, check=True)
        elif options.command == 'mac-smoke':
            binary = mac_build()
            subprocess.run([str(binary), '--self-test', '--capture', str(BUILD / 'mac/smoke.bmp')], check=True)
        elif options.command == 'mac-watch': watch(remaining)


if __name__ == '__main__':
    try: main()
    except KeyboardInterrupt: sys.exit(130)
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(f'Native command failed: {error}', file=sys.stderr)
        sys.exit(1)
