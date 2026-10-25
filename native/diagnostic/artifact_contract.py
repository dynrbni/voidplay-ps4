"""Structural launch prerequisites; these checks cannot prove console compatibility."""
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
import hashlib
import json

PAGE_SIZE = 0x4000
RUNTIME_FILES = (
    'sce_sys/about/right.sprx',
    'sce_module/libc.prx',
    'sce_module/libSceFios2.prx',
)
REQUIRED_FILES = ('eboot.bin', 'sce_sys/param.sfo', 'sce_sys/icon0.png', *RUNTIME_FILES)
BUILD_INPUTS = ('main.c', 'common.c', 'common.h', 'build.py', 'artifact_contract.py')


def build_hashes(directory: Path, source: Path) -> dict[str, str]:
    paths = {name: directory / name for name in ('diagnostic.elf', 'eboot.bin', 'config.h')}
    paths.update({name: source / name for name in BUILD_INPUTS})
    return {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in paths.items()}


def validate_build_receipt(directory: Path, source: Path) -> None:
    receipt = directory / 'build-receipt.json'
    if not receipt.is_file() or json.loads(receipt.read_text()) != build_hashes(directory, source):
        raise ValueError('No matching successful build receipt. Run build.py successfully before packaging.')
    validate_elf(directory / 'diagnostic.elf')


def runtime_sources(sdk: Path) -> dict[str, Path]:
    sample = sdk / 'samples/dialogs'
    sources = {name: sample / name for name in RUNTIME_FILES}
    for name, path in sources.items():
        if not path.is_file() or not path.stat().st_size:
            raise ValueError(f'Missing OpenOrbis runtime file: {name}. Use the complete release sysroot.')
    return sources


def validate_manifest(manifest: Path, directory: Path) -> None:
    files = ET.parse(manifest).findall('./files/file')
    targets = [entry.attrib['targ_path'] for entry in files]
    if len(set(targets)) != len(targets):
        raise ValueError('Duplicate package target paths.')
    for name in REQUIRED_FILES:
        entry = next((item for item in files if item.attrib['targ_path'] == name), None)
        if entry is None:
            raise ValueError(f'Missing launch prerequisite in GP4: {name}')
        source = directory / entry.attrib['orig_path']
        if not source.is_file() or not source.stat().st_size:
            raise ValueError(f'Empty or unavailable package input: {name}')


def validate_elf(path: Path) -> None:
    data = path.read_bytes()
    if len(data) < 64 or data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected a little-endian ELF64 executable.')
    machine = struct.unpack_from('<H', data, 18)[0]
    entry, offset = struct.unpack_from('<QQ', data, 24)
    size, count = struct.unpack_from('<HH', data, 54)
    if machine != 62 or size != 56 or not 0 < count < 100 or offset + count * size > len(data):
        raise ValueError('Invalid x86-64 program header table.')
    executable_entry = False
    loads = []
    for index in range(count):
        kind, flags, start, address, _, file_size, memory_size, alignment = struct.unpack_from('<IIQQQQQQ', data, offset + index * size)
        if kind != 1:
            continue
        if alignment < PAGE_SIZE or alignment & (alignment - 1) or start % PAGE_SIZE != address % PAGE_SIZE:
            raise ValueError(f'LOAD {index} does not satisfy PS4 16 KiB page alignment.')
        if file_size > memory_size or start + file_size > len(data):
            raise ValueError(f'LOAD {index} is outside the ELF file.')
        first_page = address // PAGE_SIZE
        last_page = (address + memory_size + PAGE_SIZE - 1) // PAGE_SIZE
        for previous_start, previous_end, previous_flags in loads:
            if max(previous_start, first_page) < min(previous_end, last_page) and flags != previous_flags:
                raise ValueError('LOAD segments with different permissions overlap a 16 KiB page.')
        loads.append((first_page, last_page, flags))
        executable_entry |= bool(flags & 1 and address <= entry < address + memory_size)
    if not executable_entry:
        raise ValueError('ELF entry is not in an executable LOAD segment.')
