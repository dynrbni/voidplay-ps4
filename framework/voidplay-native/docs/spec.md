# C++ native migration scope

The owner's direct request on 2026-10-26 selects C++ for the store client.
The attached JSX runtime brief supplies the audit, platform separation and
hardware validation sequence; it does not override that language choice.
The catalog owner dashboard remains a separate web application.

The first deliverable is a source-backed architecture/rendering audit, an
environment checker, a minimal C++ PS4 startup package and a separate native
Mac display test. It is not the complete store migration. The reported
CE-34878-0 crash must be isolated before attaching a console renderer or
porting the store. Old JSX, catalog data and admin work remain available.

The Mac display test uses a portable C++ pixel surface and scene with SDL2
only at the window/input boundary. It has no browser, React, QuickJS, PS5 SDK
or console service emulation. All console services remain unsupported.
The PS4 startup experiment imports only libc/kernel through the SDK CRT and
logs entry/heartbeat and stays alive until closed from the PS menu; it intentionally initializes no graphics, dialog,
controller, storage or networking. A black screen during its bounded run is
expected, not evidence that rendering works.

No console success, firmware compatibility, real storage, downloads or
installation may be inferred from a Mac test or a successful cross-build.
An artifact is eligible for a hardware test only after its source/dependency
receipt and package validation pass. An FTP copy never installs or launches it.

Keep future lifecycle, input, presentation and services behind portable
interfaces. Select the PS4 presenter only after a tiny hardware display test;
do not port ps5-opengl, patch the kernel or modify the system UI.
