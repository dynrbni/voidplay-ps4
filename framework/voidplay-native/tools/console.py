#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Explicit transfer or read-only GoldHEN klog capture. Never installs or launches."""
import argparse
from ftplib import FTP, all_errors
import hashlib
import json
import os
from pathlib import Path
import socket
import sys
import time
import uuid

import cli
from artifacts import sha256


def endpoint(value):
    if not value or any(c.isspace() for c in value) or '/' in value or '@' in value:
        raise argparse.ArgumentTypeError('Provide only the console hostname or IP.')
    return value


def transfer(host, port):
    cli.ps4_verify()
    package = cli.PACKAGE
    expected = sha256(package)
    final = f'/data/Voidplay-Cpp-Boot-01.00-{expected[:12]}.pkg'
    partial = '/data/.voidplay-boot-upload-' + uuid.uuid4().hex
    receipt = {'package_sha256': expected, 'remote_path': final, 'partial_path': partial,
               'read_back_verified': False, 'ready': False, 'installed': False, 'launched': False}
    evidence = cli.BUILD / 'ps4-boot/transfer.json'
    try:
        with FTP() as ftp:
            ftp.connect(host, port, timeout=5)
            ftp.login(os.environ.get('VOIDPLAY_FTP_USER', 'anonymous'), os.environ.get('VOIDPLAY_FTP_PASSWORD', ''))
            ftp.voidcmd('TYPE I')
            # Never replace an existing package, including an earlier verified transfer.
            if Path(final).name in [Path(p).name for p in ftp.nlst('/data/')]:
                raise ValueError('The destination already exists; no overwrite performed.')
            deadline = time.monotonic() + 90
            def bounded(_):
                if time.monotonic() > deadline: raise TimeoutError('FTP operation exceeded 90 seconds.')
            with package.open('rb') as source:
                ftp.storbinary('STOR ' + partial, source, blocksize=64 * 1024, callback=bounded)
            ftp.voidcmd('TYPE I')
            if ftp.size(partial) != package.stat().st_size: raise ValueError('Remote size mismatch.')
            digest = hashlib.sha256()
            received = 0
            def verify(block):
                nonlocal received
                bounded(block)
                received += len(block)
                if received > package.stat().st_size: raise ValueError('Read-back exceeds expected size.')
                digest.update(block)
            ftp.retrbinary('RETR ' + partial, verify, blocksize=64 * 1024)
            if received != package.stat().st_size or digest.hexdigest() != expected: raise ValueError('Remote SHA-256 mismatch.')
            receipt['read_back_verified'] = True
            ftp.rename(partial, final)
            receipt['ready'] = True
            print(f'FTP read-back verified: {final}\nNo installation or launch performed.')
    except Exception as error:
        receipt['error'] = f'{type(error).__name__}: {error}'
        raise
    finally:
        evidence.write_text(json.dumps(receipt, indent=2) + '\n')


def collect_klog(host, port, seconds, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    received = 0
    deadline = time.monotonic() + seconds
    # Exclusive create prevents replacing a previous crash capture.
    with output.open('xb') as log, socket.create_connection((host, port), timeout=3) as stream:
        print('Klog connected. Launch the exact boot test on the console now.', flush=True)
        stream.settimeout(1)
        while time.monotonic() < deadline:
            try: block = stream.recv(min(65536, 4 * 1024 * 1024 - received))
            except socket.timeout: continue
            if not block: break
            log.write(block); log.flush()
            received += len(block)
            if received >= 4 * 1024 * 1024: break
    print(f'Captured {received} bytes: {output}. Review before sharing; logs can contain private system data.')
    # A captured stream is evidence to inspect, never an automatic success certificate.
    return received


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['transfer', 'collect-klog'])
    parser.add_argument('--host', required=True, type=endpoint)
    parser.add_argument('--port', type=int)
    parser.add_argument('--seconds', type=int, default=30)
    parser.add_argument('--output', type=Path)
    options = parser.parse_args()
    port = options.port or (2121 if options.command == 'transfer' else 3232)
    if not 1 <= port <= 65535 or not 1 <= options.seconds <= 60: parser.error('Invalid port or capture duration (1-60 seconds).')
    if options.command == 'transfer':
        with cli.build_guard(): transfer(options.host, port)
    else:
        output = options.output or cli.BUILD / 'evidence' / f'klog-{time.time_ns()}.log'
        if not collect_klog(options.host, port, options.seconds, output): raise ValueError('No log bytes received; execution is unverified.')


if __name__ == '__main__':
    try: main()
    except KeyboardInterrupt: sys.exit(130)
    except (ValueError, RuntimeError, *all_errors) as error:
        print(f'Console operation failed: {error}', file=sys.stderr)
        sys.exit(1)
