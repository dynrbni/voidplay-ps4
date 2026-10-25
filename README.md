# Voidplay

A homebrew store project for PS4, beginning with a React/TypeScript desktop preview.
Only content the owner is authorized to redistribute is in scope.

## Status

Initial repository baseline. Store implementation is in progress on a feature branch.
PS4 firmware 12.00 execution, React rendering, controller input, networking, storage,
downloads, and installation are **unverified**. GoldHEN availability does not prove these capabilities.
No console installation mechanism is selected.

## Development direction

The first slice is a desktop home/catalog preview with explicitly labeled mock data,
search, category filters, and keyboard focus. Backend, administration, and console
integration remain separate work. See `docs/design.md` and `task_plan.md`.

## Workflow

Use `main` for stable integration and short-lived feature branches. Run component
checks, review the diff for secrets and correctness, then commit with Conventional
Commits and push to `https://github.com/dynrbni/voidplay-ps4.git`. Prefer pull requests;
never bypass protection or approval requirements.
