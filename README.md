# Voidplay

A homebrew store project for PS4, beginning with a React/TypeScript desktop preview.
Only content the owner is authorized to redistribute is in scope.

## Current status

Working desktop Home and Browse screens, search/category filters, application detail
dialogs, and keyboard focus navigation. All listings are explicitly fictional mock
entries; artwork is labeled placeholder text. No executable files or download links
are included. Loading, empty, invalid-catalog, network-error and offline states are implemented.

**This is not a PS4 release.** Firmware 12.00 execution, React rendering, controller
input, networking, storage, downloads, and installation remain unverified.
See [capability status](docs/ps4-status.md). No backend or admin dashboard exists yet.

![Voidplay desktop preview with explicitly labeled mock applications](docs/images/store-preview.png)

## Local development

Requires Node >=22.18 and npm. Verified on Node 26.7.0 / npm 11.19.0 on macOS.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Vite binds to loopback by default. Use
`npm run build` and `npm run preview` to inspect the production build locally.
The static `dist/` output is a desktop web preview, not a console package.
No environment variables, credentials, paid service, or public file hosting are needed.

```sh
npm run check       # lint, typecheck, six Node tests, production build
```

For browser regression checks, install/use `agent-browser` (verified 0.39.2) with Chrome
available and keep the dev server running in another terminal:

```sh
npm run test:e2e
```

Set `AGENT_BROWSER_BIN` if the executable is outside PATH and
`AGENT_BROWSER_EXECUTABLE_PATH` to a local Chrome binary if needed. Set `VOIDPLAY_URL`
to test a running production preview instead. Screenshots go into ignored `artifacts/`.
The test creates and closes its own browser session and mocks requests only inside that session.
See [verification](docs/verification.md) for tested flows and limitations.

## Boundaries and catalog contract

- `src/catalog.ts`: Zod input validation, fetch loader, pure search/filter functions.
- `public/catalog.mock.json`: same-origin fixture, not a published application catalog.
- `src/App.tsx`, `src/Details.tsx`: store presentation and modal lifecycle.
- `src/navigation.ts`: desktop spatial keyboard navigation independent of cards.
- `src/main.tsx`: startup and render-error recovery.
- `docs/design.md`: visual rationale and first-slice scope.

The fixture is an array of strict objects: `id` (lowercase hyphenated identifier),
`title`, `description`, `category` (`Utilities`, `Games`, `Media`), `mock: true`,
`compatibilityNotes`. IDs must be unique; unknown fields are rejected. Strings and
array size are bounded. Empty arrays are valid. Real package metadata and API routes
are deliberately not invented. Before accepting a live catalog, define and validate
release versions, distribution authorization, URLs, SHA-256 and size metadata separately.
The asynchronous loader can be replaced without rewriting cards or filters.

Tab follows document order; arrows move between controls, excluding native input/select
editing. Enter opens applications; Escape or Close returns focus. Browser offline state
is a connectivity hint, not a promise that a server is reachable. Loaded fixtures remain
viewable offline; there is no service worker or persistent offline cache.

## Workflow and licensing

Use stable `main` and short-lived feature branches. Run checks, review the diff and
secrets, commit with Conventional Commits, push only to
`https://github.com/dynrbni/voidplay-ps4.git`, then open a PR. Never bypass branch protection.

No Overdrive source/assets were copied; its repository declares no license in the
inspected metadata/root listing, so reuse is not authorized by this project.
Direct dependency license review is in [dependencies](docs/dependencies.md).
Voidplay has no project-wide distribution license selected yet.

## Next steps

Prove an OpenOrbis minimal application build and actual PS4 execution before choosing
any console renderer. Then expand store screens and define the versioned catalog API,
secure publishing dashboard, and verified download integration in separate changes.
