# SPDX-License-Identifier: GPL-3.0-only
from pathlib import Path
import contextlib
import io
import socket
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from console import collect_klog


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


if __name__ == '__main__': unittest.main()
