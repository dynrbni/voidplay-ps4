#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p build
cc -std=c11 -D_DARWIN_C_SOURCE -D_GNU_SOURCE -Wall -Wextra -Werror -fsanitize=address,undefined common.c host_test.c -o build/host-test
./build/host-test
python3 -B -m unittest discover -s . -p 'test_artifacts.py'
