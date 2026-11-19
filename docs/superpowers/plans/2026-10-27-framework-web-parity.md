# Native framework and web parity overhaul

The real web source and public catalog are the reference. Keep the working PS4
bootstrap, native React/QuickJS boundary, title ID and controller mapping.
The inherited working tree contains an unfinished measured layout/scroll/font
implementation; preserve it and repair its gaps rather than reset it. Baseline
snapshot is saved outside the repository in /tmp/voidplay-parity-start-20261027.

## Sequence

1. Audit web/native/framework/assets/input and run the inherited checks/build.
   Baseline JS tests: 21 pass / 3 fail (outdated hero/detail navigation contracts).
2. Repair shared font weights/metrics, native small text, wrap/clip restoration,
   flex constraints and reusable nested ScrollView/focus reveal.
3. Translate actual web tokens/components and continuous Discover hierarchy;
   fix header/overlays, details, collections, catalog, queue and Settings.
4. Add framework and real-app regression coverage, exercise native preview and
   capture web/native at 1920x1080; use test fixtures only for overflow stress.
5. Measure native input/render cost, run root/native/sanitizer/package checks,
   document differences, commit/push and produce clean-source PKG 01.05.

## Acceptance

Discover renders the complete real shelf list in one measured vertical document.
Controller focus reaches below viewport, scrolls each shelf independently, remains
visible below sticky header and preserves offsets during unrelated React updates.
Font family/weights/line metrics are real bundled assets with explicit diagnostics.
No browser CSS/DOM claim; unsupported style/font features fail explicitly.
No real transfers/install/storage/video support invented. Physical PS4 acceptance
requires the exact new package on the owner's console and remains separate.
