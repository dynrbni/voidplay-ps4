# SPDX-License-Identifier: GPL-3.0-only
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from artifacts import validate_elf, validate_self, read_sfo, verify_receipt, write_receipt
import cli


class ArtifactTests(unittest.TestCase):
    def test_receipt_detects_changed_input_output_and_omitted_contract(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            source, output, receipt = [root / p for p in ('source', 'output', 'receipt.json')]
            source.write_text('source-v1'); output.write_text('output-v1')
            write_receipt(receipt, [source], [output], {'target': 'fixture'})
            self.assertFalse(verify_receipt(receipt, [source], [output])['hardware_tested'])
            source.write_text('source-v2')
            with self.assertRaisesRegex(ValueError, 'altered'): verify_receipt(receipt)
            source.write_text('source-v1'); output.write_text('output-v2')
            with self.assertRaisesRegex(ValueError, 'altered'): verify_receipt(receipt)
            output.write_text('output-v1')
            with self.assertRaisesRegex(ValueError, 'omits'): verify_receipt(receipt, [root / 'missing'])
            data = json.loads(receipt.read_text()); data['hardware_tested'] = True
            receipt.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'hardware'): verify_receipt(receipt)

    def test_failed_preflight_invalidates_previous_build(self):
        with tempfile.TemporaryDirectory() as d:
            build = Path(d)
            directory = build / 'ps4-boot'; directory.mkdir()
            receipt = directory / 'receipt.json'; receipt.write_text('{}')
            with patch.object(cli, 'BUILD', build), patch.object(cli, 'ps4_environment', side_effect=ValueError('missing SDK')):
                with self.assertRaisesRegex(ValueError, 'missing SDK'): cli.ps4_build()
            self.assertFalse(receipt.exists())

    def test_self_header_and_segment_bounds(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'eboot.bin'
            data = bytearray(128); data[:4] = b'\x4f\x15\x3d\x1d'
            struct.pack_into('<HHQH', data, 12, 64, 0, 128, 1)
            struct.pack_into('<QQQQ', data, 32, 0, 64, 64, 64)
            path.write_bytes(data); validate_self(path)
            struct.pack_into('<Q', data, 40, 120)
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'outside'): validate_self(path)
            path.write_bytes(data[:40])
            with self.assertRaises(ValueError): validate_self(path)

    def test_elf_rejects_page_overlap_alignment_and_nonexecutable_entry(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'boot.elf'
            def fixture(alignment=0x4000, second_address=0x4000, entry=0x100):
                data = bytearray(0x8000); data[:6] = b'\x7fELF\x02\x01'
                struct.pack_into('<H', data, 18, 62)
                struct.pack_into('<QQ', data, 24, entry, 64)
                struct.pack_into('<HH', data, 54, 56, 2)
                struct.pack_into('<IIQQQQQQ', data, 64, 1, 5, 0, 0, 0, 0x2000, 0x2000, alignment)
                struct.pack_into('<IIQQQQQQ', data, 120, 1, 6, 0x4000, second_address, 0, 0x1000, 0x1000, 0x4000)
                path.write_bytes(data)
            fixture(); validate_elf(path)
            fixture(alignment=0x1000)
            with self.assertRaisesRegex(ValueError, 'alignment'): validate_elf(path)
            fixture(second_address=0)
            with self.assertRaisesRegex(ValueError, 'overlap'): validate_elf(path)
            fixture(entry=0x4000)
            with self.assertRaisesRegex(ValueError, 'entry'): validate_elf(path)

    def test_package_tool_zero_exit_without_validation_is_rejected(self):
        with patch.object(cli, 'run', return_value='Error: package unavailable'):
            with self.assertRaisesRegex(ValueError, 'incomplete'): cli.validate_package('fixture')
        with patch.object(cli, 'run', return_value=''):
            with self.assertRaisesRegex(ValueError, 'incomplete'): cli.validate_package('fixture')

    def test_ps4_compiler_major_is_required(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(cli, 'sdk', return_value=Path(d)), patch.dict(cli.LOCK, {'openorbis': {'files': {}}}), patch.object(cli, 'run', return_value='clang version 23.1.4'):
                with self.assertRaisesRegex(ValueError, '18'): cli.ps4_environment()

    def test_sfo_table_validation(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'param.sfo'
            data = bytearray(48)
            struct.pack_into('<4sIIII', data, 0, b'\x00PSF', 0x101, 36, 40, 1)
            struct.pack_into('<HHIII', data, 20, 0, 0x204, 3, 8, 0)
            data[36:40] = b'ID\x00\x00'; data[40:43] = b'VP\x00'
            path.write_bytes(data)
            self.assertEqual(read_sfo(path), {'ID': (0x204, 'VP')})
            struct.pack_into('<I', data, 32, 999)
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'bounds'): read_sfo(path)


if __name__ == '__main__': unittest.main()
