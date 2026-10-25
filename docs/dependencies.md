# Dependency review

Direct package `package.json` licenses inspected after install on 2026-10-25:

| Packages | License | Purpose |
| --- | --- | --- |
| react, react-dom | MIT | JSX UI and DOM renderer for desktop preview |
| zod | MIT | Runtime trust-boundary validation with inferred TypeScript types |
| vite | MIT | Local server and production bundler |
| typescript | Apache-2.0 | Strict static checks |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals | MIT | Linting and Hooks rules |
| @types/node, @types/react, @types/react-dom | MIT | Development type declarations |

Versions are pinned by `package-lock.json`. `npm audit` reported zero known vulnerabilities
at installation; this is not a comprehensive security audit. Upstream package/license
files remain in installed dependencies; no third-party source is vendored.
Transitive distribution notices still need review before shipping any redistributable release.

Manrope variable Latin WOFF2 is vendored from `@fontsource-variable/manrope` 5.3.0
(Fontsource npm archive), not a runtime package or remote font request. Copyright 2019
The Manrope Project Authors; SIL Open Font License 1.1 retained verbatim at
`public/fonts/OFL-Manrope.txt`. No font modifications. Six SVG concept illustrations
in `public/art/` were authored for this mock catalog; no commercial artwork copied.

`agent-browser` 0.39.2 was run from npm's tool cache for local testing, not added as a
runtime dependency. No icon library, remote fonts/artwork, or significant copied
third-party application code is used.

Overdrive (`MyLuxy/overdrive`) metadata reports `license: null` and its inspected root
has no LICENSE file. This is not a grant to copy it. Only the user's stated browsing
inspiration is used. OpenOrbis documentation reports GPLv3 for its project and separate
licenses for LLVM/components; no OpenOrbis tools or libraries are bundled here.
