# PS4 capability status

Updated 2026-10-26. Detailed source audit, build inputs and actual observations are in
[the native diagnostic report](ps4-diagnostic.md); reproduction and owner console steps are in
[native/diagnostic](../native/diagnostic/README.md).

| Capability | Status |
| --- | --- |
| Desktop store and separate owner admin | Tested locally; not console evidence |
| Static published catalog and Git export workflow | Implemented and tested; Pages deployment not activated |
| GoldHEN FTP | Connection observed; this does not establish firmware or application runtime |
| Native diagnostic cross-build | ELF, eboot and test PKG built on this Mac; PKG structural validation passed |
| Previous diagnostic launch on firmware 12.00 | Owner reports CE-34878-0 with no initial dialog; installed hash and crash trace unknown |
| C++ startup replacement | Separate minimal boot target; actual console launch unverified |
| Native C++ Mac preview | Display/input test implemented; complete store migration pending hardware gates |
| Total/free storage | Unverified; native candidate probe only, desktop values explicitly mock |
| Controller input | Native probe built; unverified on console |
| HTTPS and TLS validation | Native probe built; unverified on console, must test negative certificates |
| Authorized app-directory read/write | Host checks passed; unverified in the PS4 sandbox |
| React runtime on PS4 | Unverified; no full-app port attempted |
| Real store download/installation/cleanup | Unsupported and gated behind explicit interfaces |

The toolchain prerequisite blocker recorded in the earlier audit has been resolved locally:
the release sysroot and non-Apple LLVM/lld produced the diagnostic. That progress does not
establish firmware 12.00 compatibility. The OpenOrbis headers/stubs are experimental interfaces,
not official Sony SDK guarantees. No raw syscall numbers or undocumented signatures have
been added to make a failing probe appear supported.

The [C++ migration report](../framework/voidplay-native/docs/architecture.md)
records the source audit and rendering alternatives. The owner deferred FTP/Klog
activation; no replacement package has been installed or launched by this work.
