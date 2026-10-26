#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Bounded build/verification workflows for PS4 React, independent of the web store."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shlex
import shutil
import struct
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
BUILD = ROOT / 'build'
DIST = ROOT / 'dist'
DEPS = ROOT / '.deps'
LOCK = json.loads((ROOT / 'dependencies.lock.json').read_text())
sys.path.insert(0, str(REPO / 'framework/voidplay-native/tools'))
from artifacts import sha256, validate_elf, validate_self, read_sfo, write_receipt, verify_receipt
import cli as baseline

RUNTIME_MODULES = ('sce_module/libc.prx', 'sce_module/libSceFios2.prx')


def bootstrap_inputs(sdk):
    inputs = []
    for name, expected in LOCK['openorbisBootstrap']['files'].items():
        path = sdk / name
        if not path.is_file() or sha256(path) != expected:
            raise ValueError('Wrong/missing OpenOrbis bootstrap input: ' + name)
        inputs.append(path)
    return inputs


def validate_module(path):
    validate_self(path)
    data = path.read_bytes()
    count = struct.unpack_from('<H', data, 24)[0]
    elf = 32 + count * 32
    if (len(data) < elf+64 or data[elf:elf+6] != b'\x7fELF\x02\x01'
            or struct.unpack_from('<HH', data, elf+16) != (0xfe18, 62)):
        raise ValueError('Expected a PS4 dynamic PRX bootstrap module: ' + str(path))


def require_runtime_modules(directory, paths):
    missing = set(RUNTIME_MODULES) - set(paths)
    if missing:
        raise ValueError('Package omits required bootstrap module(s): ' + ', '.join(sorted(missing)))
    for name in RUNTIME_MODULES:
        validate_module(directory / name)


def build_runtime_modules(directory, environment):
    sdk, compiler, linker, converter, *_ = environment
    bootstrap_inputs(sdk)
    target = directory / 'sce_module'
    target.mkdir(exist_ok=True)
    for name, source in [('libc', 'libc.c'), ('libSceFios2', 'fios2.c')]:
        obj = target / (name + '.o')
        run([compiler.parent/'clang', '--target=x86_64-pc-freebsd12-elf', '-std=c11',
             '-fPIC', '-fno-stack-protector', '-Wall', '-Wextra', '-Werror',
             '-isysroot', sdk, '-isystem', sdk/'include', '-MD', '-MF', str(obj)+'.d',
             '-c', ROOT/'platform/ps4/modules'/source, '-o', obj])
        elf = target / (name + '.elf')
        run([linker, '-m', 'elf_x86_64', '-pie', '--no-rosegment', '-e', '_init',
             '-z', 'max-page-size=0x4000', '-z', 'common-page-size=0x4000',
             '--script', sdk/'link.x', '--eh-frame-hdr', '-L', sdk/'lib',
             obj, sdk/'lib/crtlib.o', '-lSceLibcInternal', '-lkernel', '-o', elf])
        validate_elf(elf)
        module = target / (name + '.prx')
        run([converter, '-in='+str(elf), '-out='+str(target/(name+'.oelf')),
             '--lib', module, '--paid', '0x3800000000000011'])
        validate_module(module)
    return list(RUNTIME_MODULES)


def run(args, cwd=ROOT, env=None):
    result = subprocess.run([str(a) for a in args], cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    BUILD.mkdir(exist_ok=True)
    with (BUILD/'commands.log').open('a') as log:log.write(shlex.join(str(a) for a in args)+'\n'+result.stdout+'\n')
    if result.returncode:
        raise RuntimeError(f'Command failed ({result.returncode}): {shlex.join(str(a) for a in args)}\n{result.stdout}')
    return result.stdout.strip()


def manifest(path=None):
    path = Path(path or ROOT / 'apps/voidplay/app.json').resolve()
    app = json.loads(path.read_text())
    if not isinstance(app,dict) or any(not isinstance(v,str) for v in app.values()):raise ValueError('Manifest fields must be strings.')
    if set(app) != {'name','title','titleId','version','entry'}:
        raise ValueError('App manifest needs exactly name/title/titleId/version/entry.')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', app['name']) or len(app['name'])>80 or not 1 <= len(app['title'].encode('utf-8')) <= 100:
        raise ValueError('Invalid application name/title.')
    if not re.fullmatch(r'[A-Z]{4}[0-9]{5}', app['titleId']) or not re.fullmatch(r'[0-9]{2}\.[0-9]{2}', app['version']):
        raise ValueError('Use a unique four-letter/five-digit titleId and NN.NN version.')
    entry = (path.parent / app['entry']).resolve()
    if not entry.is_relative_to(path.parent) or not entry.is_file() or entry.suffix != '.jsx':
        raise ValueError('App entry must be an existing JSX file inside its app directory.')
    return app, path, entry


def tool(name):
    value = shutil.which(name)
    if not value: raise ValueError(f'Missing tool: {name}. See README setup.')
    return Path(value).resolve()


def quickjs():
    target=DEPS/'quickjs';archive=DEPS/'quickjs-source.tar.gz'
    DEPS.mkdir(exist_ok=True)
    if not archive.is_file():
        request=urllib.request.Request(LOCK['quickjs']['url'],headers={'User-Agent':'PS4React-build/0.1'})
        with tempfile.NamedTemporaryFile(dir=DEPS,delete=False) as output:
            temporary=Path(output.name)
            try:
                with urllib.request.urlopen(request,timeout=30) as source:
                    copied=0
                    while block:=source.read(65536):
                        copied+=len(block)
                        if copied>16*1024*1024:raise ValueError('QuickJS source archive exceeds 16 MB.')
                        output.write(block)
                output.flush()
                if sha256(temporary)!=LOCK['quickjs']['sha256']:raise ValueError('QuickJS archive hash mismatch.')
                temporary.replace(archive)
            finally:temporary.unlink(missing_ok=True)
    if sha256(archive)!=LOCK['quickjs']['sha256']:raise ValueError('QuickJS source archive was altered.')
    with tarfile.open(archive) as source:
        if not target.is_dir():
            with tempfile.TemporaryDirectory(dir=DEPS) as temp:
                source.extractall(temp,filter='data')
                directories=list(Path(temp).iterdir())
                if len(directories)!=1:raise ValueError('Unexpected QuickJS archive layout.')
                shutil.move(str(directories[0]),target)
        for item in source.getmembers():
            relative=Path(item.name).parts[1:]
            if len(relative)!=1 or Path(item.name).suffix not in ['.c','.h']:continue
            original=source.extractfile(item).read()
            file=target/relative[0]
            if not file.is_file() or sha256(file)!=hashlib.sha256(original).hexdigest():raise ValueError('QuickJS source was modified: '+relative[0])
    return target


def doctor():
    print(run(['node','--version']))
    print(run([tool('clang++'),'--version']).splitlines()[0])
    print('SDL2 '+run([tool('sdl2-config'),'--version']))
    sdk, compiler, *_ = baseline.ps4_environment()
    bootstrap_inputs(sdk)
    print(f'OpenOrbis {baseline.LOCK["openorbis"]["version"]}: pinned inputs PASS; '+run([compiler,'--version']).splitlines()[0])
    if not all((sdk/'lib'/name).is_file() for name in ['libSceVideoOut.so','libScePad.so','libSceUserService.so']):raise ValueError('Required PS4 display/input imports are missing.')
    for dependency in ['react','react-reconciler','esbuild']:
        path=ROOT/'node_modules'/dependency/'package.json'
        if not path.is_file() or json.loads(path.read_text())['version']!=LOCK[dependency]:raise ValueError('Run npm ci for pinned '+dependency)
    from PIL import Image
    print('Pinned npm packages, Pillow, and PS4 display/input imports PASS.')
    print('No console launch or firmware compatibility inferred.')


def bundle():
    app, path, _ = manifest()
    print(run(['node',ROOT/'tools/bundle.mjs',path]))
    data = (BUILD/'app.js').read_bytes()
    if len(data) > 2_000_000: raise ValueError('App bundle exceeds 2 MB.')
    (BUILD/'app_bundle.h').write_text('static const unsigned char app_bundle[] = {'+','.join(str(b) for b in data)+',0};\nstatic const unsigned long app_bundle_length = '+str(len(data))+';\n')
    return app


def sources():
    return sorted([*ROOT.glob('runtime/*.cpp'), *ROOT.glob('runtime/*.hpp'), *ROOT.glob('renderer/*.cpp'), *ROOT.glob('platform/**/*.cpp'), *ROOT.glob('platform/**/*.c'), *ROOT.glob('platform/**/*.h'), *ROOT.glob('packages/**/*.mjs'), *ROOT.glob('apps/**/*.*'), *ROOT.glob('tools/*.*'), ROOT/'dependencies.lock.json', ROOT/'package-lock.json'])


def compile_target(target, native_only=False, sanitize=False):
    BUILD.mkdir(exist_ok=True)
    name = target+('-native' if native_only else '')+('-asan' if sanitize else '')
    directory=BUILD/name; directory.mkdir(exist_ok=True)
    print(run([sys.executable,ROOT/'tools/prepare_assets.py']))
    if not native_only: bundle()
    if target=='ps4':
        sdk, cxx, linker, converter, packer, gp4 = baseline.ps4_environment()
        cc=cxx.parent/'clang'
        flags=['--target=x86_64-pc-freebsd12-elf','-fPIC','-fno-stack-protector','-isysroot',sdk,'-isystem',sdk/'include','-I',ROOT/'platform/ps4/compat','-D__PS4__']
    else:
        if platform.system() != 'Darwin': raise ValueError('Desktop host currently qualified on macOS only.')
        cc=tool('clang');cxx=tool('clang++'); flags=[]
    flags += ['-O1','-g','-fno-omit-frame-pointer','-I',ROOT/'runtime','-I',BUILD]
    if sanitize: flags+=['-fsanitize=address,undefined']
    objects=[]
    project=[ROOT/'renderer/canvas.cpp',ROOT/'renderer/media.cpp',ROOT/'runtime/preferences.cpp',ROOT/'runtime/main.cpp',ROOT/f'platform/{"ps4" if target=="ps4" else "desktop"}/host.cpp']
    if native_only: flags+=['-DPS4_REACT_NATIVE_ONLY']
    else:
        qjs=quickjs();flags+=['-isystem',qjs];project+=[ROOT/'runtime/quickjs.cpp']
        for file in ['dtoa.c','libregexp.c','libunicode.c','quickjs.c']:
            out=directory/(file+'.o')
            run([cc,*flags,'-std=c11','-D_GNU_SOURCE','-D__STDC_NO_ATOMICS__=1','-DNDEBUG','-MD','-MF',str(out)+'.d','-c',qjs/file,'-o',out]);objects.append(out)
    sdl=shlex.split(run(['sdl2-config','--cflags'])) if target=='desktop' else []
    for file in project:
        out=directory/(file.parent.name+'-'+file.name+'.o')
        run([cxx,*flags,*(['-nostdinc++','-isystem',sdk/'include/c++/v1'] if target=='ps4' else []),'-std=c++17','-fno-exceptions','-fno-rtti','-Wall','-Wextra','-Werror',*sdl,'-D__PS4__' if target=='ps4' else '-DPS4_REACT_DESKTOP','-MD','-MF',str(out)+'.d','-c',file,'-o',out]);objects.append(out)
    if target=='desktop':
        binary=directory/'PS4React'
        linked=directory/'PS4React.new'
        run([cxx,*(['-fsanitize=address,undefined'] if sanitize else []),*objects,*shlex.split(run(['sdl2-config','--libs'])),'-o',linked])
        linked.replace(binary)
        app=directory/'PS4React.app'/'Contents';(app/'MacOS').mkdir(parents=True,exist_ok=True)
        # Replacing the inode avoids macOS retaining the previous executable's code-signing cache.
        staged=app/'MacOS/PS4React.new'
        shutil.copyfile(binary,staged);staged.chmod(0o755);staged.replace(app/'MacOS/PS4React')
        with (app/'Info.plist').open('wb') as output:plistlib.dump({'CFBundleIdentifier':'dev.voidplay.ps4react.preview','CFBundleName':'Voidplay [BETA]','CFBundleExecutable':'PS4React','CFBundlePackageType':'APPL','CFBundleVersion':'1','NSHighResolutionCapable':True},output)
        run(['/usr/bin/codesign','--force','--sign','-',app.parent])
        run(['/usr/bin/codesign','--verify','--strict',app.parent])
        return app/'MacOS/PS4React'
    elf=directory/'app.elf'
    run([linker,'-m','elf_x86_64','-pie','--no-rosegment','-z','max-page-size=0x4000','-z','common-page-size=0x4000','--script',sdk/'link.x','--eh-frame-hdr','-L',sdk/'lib',sdk/'lib/crt1.o',*objects,'-lc','-lm','-lkernel','-lSceVideoOut','-lScePad','-lSceUserService','-o',elf])
    validate_elf(elf)
    eboot=directory/'eboot.bin'
    run([converter,'-in='+str(elf),'-out='+str(directory/'app.oelf'),'--eboot',eboot,'--paid','0x3800000000000011'])
    validate_self(eboot)
    return directory


def package(native_only=False):
    DIST.mkdir(exist_ok=True)
    receipt=DIST/'receipt.json';receipt.unlink(missing_ok=True)
    app, _, _=manifest()
    if not (REPO/'public/art/orbit-workshop-hero.webp').is_file():raise ValueError('Missing package icon source: public/art/orbit-workshop-hero.webp')
    for name in ['QuickJS-MIT.txt','React-MIT.txt','Reconciler-MIT.txt','Scheduler-MIT.txt','musl-MIT.txt','Manrope-OFL.txt']:
        if not (ROOT/'licenses'/name).is_file():raise ValueError('Missing required dependency notice: '+name)
    directory=compile_target('ps4',native_only)
    environment=baseline.ps4_environment()
    sdk, compiler, linker, converter, packer, gp4=environment
    modules=build_runtime_modules(directory, environment)
    sce=directory/'sce_sys';sce.mkdir(exist_ok=True)
    sfo=sce/'param.sfo';content='IV0000-'+app['titleId']+'_00-PS4REACTHELLO001'
    run([packer,'sfo_new',sfo])
    fields={'APP_TYPE':('Integer','4','1'),'APP_VER':('Utf8','8',app['version']),'ATTRIBUTE':('Integer','4','0'),'CATEGORY':('Utf8','4','gd'),'CONTENT_ID':('Utf8','48',content),'DOWNLOAD_DATA_SIZE':('Integer','4','0'),'SYSTEM_VER':('Integer','4','0'),'TITLE':('Utf8','128',app['title']+(' Native Display' if native_only else '')),'TITLE_ID':('Utf8','12',app['titleId']),'VERSION':('Utf8','8',app['version'])}
    for key,(kind,size,value) in fields.items():run([packer,'sfo_setentry',sfo,key,'--type',kind,'--maxsize',size,'--value',value])
    shutil.copyfile(BUILD/'voidplay-icon.png',sce/'icon0.png')
    notices=directory/'notices';notices.mkdir(exist_ok=True)
    for name in ['LICENSE','NOTICE']:shutil.copyfile(ROOT/name,notices/name)
    for source in (ROOT/'licenses').glob('*.txt'):shutil.copyfile(source,notices/source.name)
    paths=['eboot.bin','sce_sys/param.sfo','sce_sys/icon0.png',*modules]+[str(p.relative_to(directory)) for p in notices.iterdir()]
    require_runtime_modules(directory, paths)
    run([gp4,'-out','pkg.gp4','--content-id='+content,'--files',' '.join(paths)],cwd=directory)
    project=ET.parse(directory/'pkg.gp4');rootdir=project.getroot().find('rootdir');rootdir.clear()
    for name in paths:
        node=rootdir
        for part in Path(name).parts[:-1]:
            child=node.find(f"dir[@targ_name='{part}']")
            if child is None:child=ET.SubElement(node,'dir',{'targ_name':part})
            node=child
    project.write(directory/'pkg.gp4',encoding='utf-8',xml_declaration=True)
    print(run([packer,'pkg_build','pkg.gp4','.'],cwd=directory))
    pkg=directory/(content+'.pkg')
    result=run([packer,'pkg_validate','--verbose',pkg])
    if 'FAIL' in result.upper() or 'ERROR' in result.upper():raise ValueError('Package validator reported a failure.')
    for label in ['PFS Image Digest','Body Digest','PKG Header Digest','PKG Header Signature','Debug RIF Signature']:
        if not any(line.startswith('[OK]') and label in line for line in result.splitlines()):raise ValueError('Incomplete package validation: '+label)
    target=DIST/('PS4React-NativeDisplay.pkg' if native_only else 'Voidplay-BETA.pkg')
    packaged_sfo=verify_extracted(packer,pkg,directory,paths)
    (directory/'packaged-param.sfo').write_bytes(packaged_sfo)
    shutil.copyfile(pkg,target)
    input_files=[*sources(),*ROOT.glob('licenses/*.txt'),ROOT/'LICENSE',ROOT/'NOTICE',REPO/'public/art/orbit-workshop-hero.webp',*([BUILD/'app.js'] if not native_only else []),compiler,linker,converter,packer,gp4,sdk/'link.x',sdk/'lib/crt1.o',sdk/'lib/libc.a',sdk/'lib/libm.a',*[sdk/'lib'/name for name in ['libkernel.so','libSceVideoOut.so','libScePad.so','libSceUserService.so']],*[sdk/'include/orbis'/name for name in ['VideoOut.h','Pad.h','UserService.h','libkernel.h']]]
    input_files.extend(bootstrap_inputs(sdk))
    for dependency in directory.rglob('*.d'):
        text=dependency.read_text().replace('\\\n','')
        input_files.extend(Path(name).resolve() for name in shlex.split(text.split(':',1)[1]))
    input_files.extend([REPO/'framework/voidplay-native/tools/cli.py',REPO/'framework/voidplay-native/tools/artifacts.py'])
    input_files=sorted(set(input_files))
    if not native_only:input_files+=sorted(quickjs().glob('*.h'))+sorted(quickjs().glob('*.c'))
    module_outputs=[directory/'sce_module'/(name+suffix) for name in ['libc','libSceFios2'] for suffix in ['.elf','.oelf','.prx']]
    write_receipt(receipt,input_files,[target,directory/'app.elf',directory/'eboot.bin',sfo,directory/'packaged-param.sfo',directory/'pkg.gp4',*module_outputs],{'app':app,'native_only':native_only,'source_commit':run(['git','rev-parse','HEAD'],cwd=REPO),'framework_sources_dirty':bool(run(['git','status','--porcelain','--untracked-files=all','--','framework/ps4-react'],cwd=REPO)),'console_launch':'unverified','package_sha256':sha256(target),'package_bytes':target.stat().st_size})
    target.with_suffix('.pkg.sha256').write_text(sha256(target)+'  '+target.name+'\n')
    print(f'PACKAGE {target}\nSHA256 {sha256(target)}\nLocal structural checks PASS; console launch UNVERIFIED.')


def verify_extracted(packer,package,directory,paths):
    require_runtime_modules(directory, paths)
    with tempfile.TemporaryDirectory(prefix='ps4react-extract-') as temp:
        root=Path(temp)
        run([packer,'pkg_extract',package,root])
        expected=set(paths)-{'sce_sys/param.sfo','sce_sys/icon0.png'}
        actual={str(p.relative_to(root/'uroot')) for p in (root/'uroot').rglob('*') if p.is_file()}
        if actual!=expected|{'sce_sys/keystone'}:raise ValueError('Unexpected/missing files in package filesystem: '+str(actual^expected))
        keystone=(root/'uroot/sce_sys/keystone').read_bytes()
        if len(keystone)!=96 or not keystone.startswith(b'keystone'):raise ValueError('Invalid generated package keystone.')
        for name in expected:
            if sha256(root/'uroot'/name)!=sha256(directory/name):raise ValueError('Packaged bytes differ: '+name)
        listing=run([packer,'pkg_listentries',package])
        final_sfo=None
        for tag,name in [('PARAM_SFO','sce_sys/param.sfo'),('ICON0_PNG','sce_sys/icon0.png')]:
            rows=[line.split() for line in listing.splitlines() if line.split() and line.split()[-1]==tag]
            if len(rows)!=1 or not rows[0][3].isdigit():raise ValueError('Package metadata entry missing: '+tag)
            file=root/tag;run([packer,'pkg_extractentry',package,rows[0][3],file])
            if tag=='ICON0_PNG':
                if sha256(file)!=sha256(directory/name):raise ValueError('Package icon mismatch.')
            else:
                before,after=read_sfo(directory/name),read_sfo(file)
                if any(after.get(k)!=v for k,v in before.items()) or set(after)-set(before)!={'PUBTOOLINFO','PUBTOOLVER'}:raise ValueError('Packaged SFO mismatch.')
                final_sfo=file.read_bytes()
        return final_sfo


def verify():
    receipt=verify_receipt(DIST/'receipt.json')
    app=receipt['metadata']['app'];directory=BUILD/('ps4-native' if receipt['metadata']['native_only'] else 'ps4')
    validate_elf(directory/'app.elf');validate_self(directory/'eboot.bin')
    fields=read_sfo(directory/'sce_sys/param.sfo')
    for key,value in [('TITLE_ID',app['titleId']),('APP_VER',app['version'])]:
        if fields[key][1]!=value:raise ValueError('SFO mismatch: '+key)
    _,_,_,_,packer,_=baseline.ps4_environment()
    target=DIST/('PS4React-NativeDisplay.pkg' if receipt['metadata']['native_only'] else 'Voidplay-BETA.pkg')
    paths=[entry.attrib['targ_path'] for entry in ET.parse(directory/'pkg.gp4').getroot().findall('files/file')]
    verify_extracted(packer,target,directory,paths)
    print('Receipt/ELF/SELF/SFO and extracted package bytes PASS; hardware UNVERIFIED.')


def smoke():
    binary=compile_target('desktop')
    capture=BUILD/'hello-world.ppm'
    log=run([binary,'--frames','8','--capture',capture],env={**os.environ,'PS4_REACT_SMOKE_INPUT':'1'})
    if 'React bundle evaluated' not in log or '[shutdown] clean' not in log:raise ValueError('Native React smoke did not complete.')
    from PIL import Image
    image=Image.open(capture)
    if image.size!=(1920,1080) or len(image.getcolors(1920*1080) or [])<4:raise ValueError('Expected a nonempty 1080p React framebuffer.')
    image.save(BUILD/'hello-world.png')
    (BUILD/'smoke.log').write_text(log+'\n')
    print(log+'\nMac native React frame PASS; capture '+str(BUILD/'hello-world.png'))


def tests():
    print(run(['node','--test',ROOT/'tests/layout.test.mjs',ROOT/'tests/store.test.mjs']))
    print(run([sys.executable,'-B','-m','unittest','discover','-s',ROOT/'tests','-p','test_*.py']))
    compile_target('desktop',sanitize=True)
    directory=BUILD/'desktop-asan';binary=directory/'runtime-test'
    cc=tool('clang++');qjs=quickjs()
    objects=[p for p in directory.glob('*.o') if p.name not in ['runtime-main.cpp.o','desktop-host.cpp.o']]
    print(run([cc,'-std=c++17','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I',ROOT/'runtime','-I',BUILD,ROOT/'tests/runtime.cpp',*objects,'-o',binary]))
    print(run([binary]))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',choices=['doctor','bundle','native','desktop','preview','ps4','verify','test','smoke'])
    options=parser.parse_args();BUILD.mkdir(exist_ok=True)
    with (BUILD/'.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise ValueError('A PS4 React build is already active.')
        op=options.operation
        if op=='doctor':doctor()
        elif op=='bundle':bundle()
        elif op=='native':package(True)
        elif op=='ps4':package()
        elif op=='verify':verify()
        elif op=='desktop':print(compile_target('desktop'))
        elif op=='preview':subprocess.run([compile_target('desktop')],check=True)
        elif op=='smoke':smoke()
        elif op=='test':tests()

if __name__=='__main__':
    try:main()
    except (ValueError,RuntimeError,OSError,ImportError,subprocess.CalledProcessError) as error:
        print('PS4 React command failed: '+str(error),file=sys.stderr);sys.exit(1)
