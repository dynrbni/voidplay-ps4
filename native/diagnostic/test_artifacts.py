import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
import struct
import json
import os
import shutil
import subprocess
import sys
from artifact_contract import BUILD_INPUTS, REQUIRED_FILES, RUNTIME_FILES, build_hashes, runtime_sources, validate_manifest, validate_elf, validate_build_receipt


def elf_fixture(alignment=0x4000, second_address=0x4000, second_offset=0x8000):
    data = bytearray(0xC000)
    data[:6] = b'\x7fELF\x02\x01'
    struct.pack_into('<H', data, 18, 62)
    struct.pack_into('<QQ', data, 24, 0x20, 64)
    struct.pack_into('<HH', data, 54, 56, 2)
    struct.pack_into('<IIQQQQQQ', data, 64, 1, 5, 0x4000, 0, 0, 0x1000, 0x1000, 0x4000)
    struct.pack_into('<IIQQQQQQ', data, 120, 1, 4, second_offset, second_address, 0, 0x1000, 0x1000, alignment)
    return data


class PackageContractTests(unittest.TestCase):
    def test_original_incomplete_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = ET.Element('psproject')
            files = ET.SubElement(project, 'files')
            for name in ('eboot.bin', 'sce_sys/param.sfo', 'sce_sys/icon0.png'):
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b'fixture')
                ET.SubElement(files, 'file', targ_path=name, orig_path=name)
            manifest = root / 'pkg.gp4'
            ET.ElementTree(project).write(manifest)
            with self.assertRaisesRegex(ValueError, 'right.sprx'):
                validate_manifest(manifest, root)

    def test_every_launch_input_is_required_and_must_be_nonempty(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = ET.Element('psproject')
            files = ET.SubElement(project, 'files')
            for name in REQUIRED_FILES:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b'fixture')
                ET.SubElement(files, 'file', targ_path=name, orig_path=name)
            manifest = root / 'pkg.gp4'
            ET.ElementTree(project).write(manifest)
            validate_manifest(manifest, root)
            for name in RUNTIME_FILES:
                file = root / name
                file.write_bytes(b'')
                with self.assertRaisesRegex(ValueError, name):
                    validate_manifest(manifest, root)
                file.write_bytes(b'fixture')

    def test_incomplete_sdk_cannot_silently_produce_a_package(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'Missing OpenOrbis runtime'):
                runtime_sources(Path(directory))

    def test_load_page_alignment_and_permission_overlap(self):
        with tempfile.TemporaryDirectory() as directory:
            elf = Path(directory) / 'test.elf'
            elf.write_bytes(elf_fixture())
            validate_elf(elf)
            elf.write_bytes(elf_fixture(alignment=0x1000))
            with self.assertRaisesRegex(ValueError, '16 KiB'):
                validate_elf(elf)
            elf.write_bytes(elf_fixture(second_address=0x2000, second_offset=0x6000))
            with self.assertRaisesRegex(ValueError, 'overlap'):
                validate_elf(elf)

    def test_failed_or_stale_build_cannot_repackage_an_old_eboot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('eboot.bin', 'config.h', *BUILD_INPUTS):
                (root / name).write_bytes(b'fixture')
            (root / 'diagnostic.elf').write_bytes(elf_fixture())
            with self.assertRaisesRegex(ValueError, 'successful build receipt'):
                validate_build_receipt(root, root)
            (root / 'build-receipt.json').write_text(json.dumps(build_hashes(root, root)))
            validate_build_receipt(root, root)
            (root / 'main.c').write_text('modified after build')
            with self.assertRaisesRegex(ValueError, 'successful build receipt'):
                validate_build_receipt(root, root)

    def test_failed_preflight_invalidates_previous_build_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'build').mkdir()
            receipt = root / 'build/build-receipt.json'
            receipt.write_text('{}')
            for name in ('build.py', 'artifact_contract.py'):
                shutil.copyfile(Path(__file__).parent / name, root / name)
            result = subprocess.run([sys.executable, '-B', str(root / 'build.py')], env=os.environ | {'OO_PS4_TOOLCHAIN': ''}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Set OO_PS4_TOOLCHAIN', result.stderr)
            self.assertFalse(receipt.exists())


if __name__ == '__main__':
    unittest.main()
