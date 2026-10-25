# SPDX-License-Identifier: GPL-3.0-only
"""Receipts and structural checks; none of these establish console execution."""
import hashlib
import json
from pathlib import Path
import struct


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def write_receipt(path, inputs, outputs, metadata):
    payload = {
        'schema': 1,
        'inputs': {str(Path(p).resolve()): sha256(p) for p in inputs},
        'outputs': {str(Path(p).resolve()): sha256(p) for p in outputs},
        'metadata': metadata,
        'hardware_tested': False,
    }
    path.write_text(json.dumps(payload, indent=2) + '\n')


def verify_receipt(path, required_inputs=(), required_outputs=()):
    if not path.is_file():
        raise ValueError('No successful build receipt; build this target first.')
    receipt = json.loads(path.read_text())
    if receipt.get('schema') != 1 or receipt.get('hardware_tested') is not False:
        raise ValueError('Invalid build receipt schema or hardware status.')
    for group, required in [('inputs', required_inputs), ('outputs', required_outputs)]:
        hashes = receipt.get(group)
        if not isinstance(hashes, dict) or not hashes:
            raise ValueError(f'Invalid receipt {group}.')
        if not set(str(Path(p).resolve()) for p in required).issubset(hashes):
            raise ValueError(f'Receipt omits required {group}.')
        for name, expected in hashes.items():
            if not Path(name).is_file() or sha256(name) != expected:
                raise ValueError(f'Stale or altered artifact/input: {name}')
    return receipt


def validate_elf(path):
    # Same 16 KiB segment contract as native/diagnostic, applied before FSELF conversion.
    data = path.read_bytes()
    if len(data) < 64 or data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected little-endian ELF64.')
    machine = struct.unpack_from('<H', data, 18)[0]
    entry, offset = struct.unpack_from('<QQ', data, 24)
    size, count = struct.unpack_from('<HH', data, 54)
    if machine != 62 or size != 56 or not 0 < count < 100 or offset + count * size > len(data):
        raise ValueError('Invalid x86-64 ELF program table.')
    executable = False
    loads = []
    for index in range(count):
        kind, flags, start, address, _, filesz, memsz, alignment = struct.unpack_from('<IIQQQQQQ', data, offset + index * size)
        if kind != 1:
            continue
        if alignment < 0x4000 or alignment & (alignment - 1) or start % 0x4000 != address % 0x4000:
            raise ValueError('ELF LOAD violates 16 KiB alignment.')
        if filesz > memsz or start + filesz > len(data):
            raise ValueError('ELF LOAD outside file bounds.')
        first, last = address // 0x4000, (address + memsz + 0x3fff) // 0x4000
        for previous_first, previous_last, previous_flags in loads:
            if max(previous_first, first) < min(previous_last, last) and flags != previous_flags:
                raise ValueError('ELF LOAD permissions overlap within a 16 KiB page.')
        loads.append((first, last, flags))
        executable |= bool(flags & 1 and address <= entry < address + memsz)
    if not executable:
        raise ValueError('ELF entry is not executable.')


def validate_self(path):
    data = path.read_bytes()
    if len(data) < 32 or data[:4] != b'\x4f\x15\x3d\x1d':
        raise ValueError('Invalid SELF header.')
    header_size, meta_size = struct.unpack_from('<HH', data, 12)
    file_size = struct.unpack_from('<Q', data, 16)[0]
    count = struct.unpack_from('<H', data, 24)[0]
    if file_size != len(data) or not count or 32 + count * 32 > header_size or header_size + meta_size > len(data):
        raise ValueError('Invalid SELF sizes/segment table.')
    for index in range(count):
        _, offset, size, _ = struct.unpack_from('<QQQQ', data, 32 + index * 32)
        if offset + size > len(data):
            raise ValueError('SELF segment outside file.')


def read_sfo(path):
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b'\x00PSF': raise ValueError('Invalid SFO header.')
    _, version, keys, values, count = struct.unpack_from('<4sIIII', data)
    if version != 0x101 or count > 256 or 20 + count * 16 > keys or not keys < values <= len(data):
        raise ValueError('Invalid SFO table bounds.')
    result = {}
    for i in range(count):
        key, kind, size, maximum, offset = struct.unpack_from('<HHIII', data, 20 + 16 * i)
        start = keys + key
        end = data.find(b'\x00', start, values)
        if not keys <= start < values or end < 0 or size > maximum or values + offset + maximum > len(data):
            raise ValueError('Invalid SFO entry bounds.')
        name = data[start:end].decode('ascii')
        raw = data[values + offset:values + offset + size]
        if kind == 0x404 and size == 4: value = struct.unpack('<I', raw)[0]
        elif kind == 0x204 and raw.endswith(b'\x00'): value = raw[:-1].decode('utf-8')
        else: raise ValueError('Unsupported SFO entry format.')
        if name in result: raise ValueError('Duplicate SFO key.')
        result[name] = (kind, value)
    return result
