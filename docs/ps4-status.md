# PS4 feasibility: initial evidence

## Capability matrix

| Capability | Status | Evidence / next proof |
| --- | --- | --- |
| Desktop React catalog | Confirmed on local Chrome | Build + browser regression; not console evidence |
| GoldHEN on firmware 12.00 | Owner-reported | Not independently observed in this session |
| OpenOrbis build on this Mac | Blocked by prerequisites | `OO_PS4_TOOLCHAIN` unset; Homebrew LLVM binaries absent at `/opt/homebrew/opt/llvm/bin` |
| Small example on PS4 | Not attempted | Requires successful toolchain build and owner-supervised console run |
| React/JSX console renderer | Unverified | No PS4-compatible embedded runtime selected |
| Native rendering and controller | Upstream samples exist; local unverified | `hello_world`, `graphics`, `piglet`, `input` need independent build/run proofs |
| HTTP/networking | Upstream samples exist; local unverified | `net_http`, `networking` need on-device requests |
| Storage/download/resume/checksum | Unverified | Separate write/read, interruption, range, and integrity tests required |
| Automatic installation | Unsupported in Voidplay | Disabled; no verified mechanism selected |

## Authoritative upstream observations

Inspected 2026-10-25:

- [OpenOrbis README](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/master/README.md): requires non-Apple LLVM (`brew install llvm`), `OO_PS4_TOOLCHAIN`, and built libraries/tools from a release or a source build. The README describes a macOS PKG installer but this does not establish availability for the latest release or Apple Silicon.
- [Latest release API](https://api.github.com/repos/OpenOrbis/OpenOrbis-PS4-Toolchain/releases/latest): v0.5.4, published 2026-01-04; only listed asset `toolchain-llvm-18.tar.gz`, 158,688,666 bytes. Platform/architecture suitability was not established from its filename. No installer was run or archive downloaded.
- [hello_world Makefile](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/master/samples/hello_world/Makefile): Darwin compiler paths are hardcoded to `/usr/local/opt/llvm/bin`; this Apple Silicon Mac uses `/opt/homebrew`. Link target is x86_64 FreeBSD ELF, not macOS. Build also requires macOS `create-fself`, `create-gp4`, `PkgTool.Core`, built libraries and assets.
- [Samples](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/tree/master/samples) include input/networking/rendering examples. Their existence is not evidence of firmware 12.00 behavior.

## Next reproducible experiment (not yet verified)

1. Obtain/review release archive manifest and executable architecture before executing tools. Establish whether usable macOS/arm64 tools exist; otherwise build upstream host tools with their documented prerequisites. Review OpenOrbis GPLv3 and bundled component notices before redistribution.
2. Install Homebrew LLVM if approved by the operator, set `OO_PS4_TOOLCHAIN` to the extracted/built toolchain, and validate `include`, `lib`, and macOS packaging/conversion tools. Do not substitute Apple clang.
3. From an isolated copy of the upstream `samples/hello_world`, attempt:

   ```sh
   make CC="$(brew --prefix llvm)/bin/clang" \
     CCX="$(brew --prefix llvm)/bin/clang++" \
     LD="$(brew --prefix llvm)/bin/ld.lld"
   ```

   Record exact upstream commit/release, host architectures, command output and artifact hash. The command overrides upstream Intel Homebrew paths; it is a proposed test, not a successful recipe.
4. Arrange the owner's existing authorized execution path; no console address or on-device observation is available here. Record launch result on firmware 12.00 separately from build success. Do not enable installation in the store.
5. Test rendering, input, HTTP, filesystem and interrupted transfers independently before deciding native versus embedded React. Do not import `ps5-react`.

No system packages or shell profiles were modified. The toolchain investigation remains an early prerequisite assessment, not a compatibility claim.
