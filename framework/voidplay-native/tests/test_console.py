# SPDX-License-Identifier: GPL-3.0-only
from pathlib import Path
import contextlib
import io
import socket
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
import json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import console
from console import collect_klog
from artifacts import sha256


class MemoryFTP:
    """Transfer-state fixture only; this does not emulate or qualify GoldHEN FTP."""
    def __init__(self, corrupt=False):
        self.files = {}
        self.corrupt = corrupt
        self.renames = []
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def connect(self, *args, **kwargs): pass
    def login(self, *args, **kwargs): pass
    def voidcmd(self, _): pass
    def nlst(self, _): return list(self.files)
    def storbinary(self, command, source, blocksize, callback):
        data = source.read()
        callback(data)
        self.files[command[5:]] = data
    def size(self, path): return len(self.files[path])
    def retrbinary(self, command, callback, blocksize):
        data = self.files[command[5:]]
        callback(b'X' * len(data) if self.corrupt else data)
    def rename(self, source, target):
        self.renames.append((source, target))
        self.files[target] = self.files.pop(source)


class LogCaptureTests(unittest.TestCase):
    def test_capture_preserves_bytes_and_refuses_existing_output(self):
        payload = b'[voidplay-boot] main reached build=fixture\n'
        with socket.socket() as server, tempfile.TemporaryDirectory() as directory:
            server.bind(('127.0.0.1', 0)); server.listen(1)
            def send():
                with server.accept()[0] as client: client.sendall(payload)
            worker = threading.Thread(target=send); worker.start()
            output = Path(directory) / 'capture.log'
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(collect_klog('127.0.0.1', server.getsockname()[1], 1, output), len(payload))
                self.assertEqual(output.read_bytes(), payload)
                with self.assertRaises(FileExistsError): collect_klog('127.0.0.1', server.getsockname()[1], 1, output)
            finally: worker.join(timeout=2)


class TransferGateTests(unittest.TestCase):
    def exercise(self, corrupt=False, existing=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'ps4-boot').mkdir()
            package = root / 'fixture.pkg'; package.write_bytes(b'package-fixture' * 128)
            ftp = MemoryFTP(corrupt)
            if existing: ftp.files[f'/data/Voidplay-Cpp-Boot-01.00-{sha256(package)[:12]}.pkg'] = b'previous'
            with patch.object(console.cli, 'PACKAGE', package), patch.object(console.cli, 'BUILD', root), patch.object(console.cli, 'ps4_verify'), patch.object(console, 'FTP', return_value=ftp), contextlib.redirect_stdout(io.StringIO()):
                if corrupt or existing:
                    with self.assertRaises(ValueError): console.transfer('fixture', 2121)
                else: console.transfer('fixture', 2121)
            receipt = json.loads((root / 'ps4-boot/transfer.json').read_text())
            self.assertFalse(receipt['installed'] or receipt['launched'])
            return ftp, receipt

    def test_matching_readback_is_renamed_without_installing(self):
        ftp, receipt = self.exercise()
        self.assertTrue(receipt['ready'] and receipt['read_back_verified'])
        self.assertEqual(len(ftp.renames), 1)
        self.assertIn(receipt['remote_path'], ftp.files)

    def test_corrupted_readback_never_gets_package_suffix(self):
        ftp, receipt = self.exercise(corrupt=True)
        self.assertFalse(receipt['ready'] or receipt['read_back_verified'])
        self.assertFalse(ftp.renames)
        self.assertTrue(all(not name.endswith('.pkg') for name in ftp.files))

    def test_existing_remote_package_is_preserved(self):
        ftp, receipt = self.exercise(existing=True)
        self.assertFalse(receipt['ready'] or receipt['read_back_verified'])
        self.assertFalse(ftp.renames)
        self.assertEqual(list(ftp.files.values()), [b'previous'])


if __name__ == '__main__': unittest.main()
