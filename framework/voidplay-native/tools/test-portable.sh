#!/bin/sh
set -eu
runtime_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$runtime_root/build/tests"
"${CXX:-clang++}" -std=c++17 -g -Wall -Wextra -Werror -fsanitize=address,undefined -fno-omit-frame-pointer \
  -I "$runtime_root/include" "$runtime_root/native/shared/scene.cpp" "$runtime_root/tests/scene_test.cpp" \
  -o "$runtime_root/build/tests/scene-test"
"$runtime_root/build/tests/scene-test"
python3 -B -m unittest discover -s "$runtime_root/tests" -p 'test_*.py'
