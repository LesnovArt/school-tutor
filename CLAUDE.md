# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

`AGENTS.md` is authoritative for workflow; read it, `docs/agent-guide.md`, the relevant section of `IMPLEMENTATION_PLAN.md`, and `docs/implementation-checklist.md` before changing code. Key rules from them:

- Work is delivered as sequential PRs. Only work in the PR slice the user has authorized (currently PR 1: shell, SQLite, profiles, UI language, diagnostics, packaging — no AI, enrollments, lessons, or credentials). Don't create speculative `src/features/` / `src/infrastructure/` layers.
- Do not commit or push; the user creates branches and commits. Check the branch, diff, and untracked files first and preserve user changes (e.g. `tbd.md` is the user's scratch notes).
- Checklist marks must reflect actual results. Don't claim packaged-app UI, Windows CI, or `npm run make` verification unless it was run on the current code.

## Commands

Requires Node >= 22.13 (CI uses 24).

```
npm start                 # electron-forge dev run (renderer at /main_window/index.html; 404 at server root is expected)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint src --max-warnings=0
npm test                  # vitest run (no vitest config file; tests are src/**/*.test.ts beside the code)
npx vitest run src/main/db/index.test.ts          # single test file
npx vitest run -t "name fragment"                 # single test by name
npm run make              # package for current OS (may need to download an Electron artifact)
npm run smoke:package     # packaged SQLite runtime smoke check; run after make
```

CI (`.github/workflows/package.yml`) runs typecheck, lint, test, make on macOS and Windows, plus `smoke:package` on macOS only.

## Architecture

Electron Forge + Webpack app (main / preload / renderer) with React 19 (React Compiler enabled via babel-loader), better-sqlite3, zod, and neverthrow.

- **Main process** (`src/main/`): `index.ts` composes lifecycle (single-instance, shutdown, macOS reopen, DB wiring). `window.ts` creates the secure `BrowserWindow` and tracks renderer readiness. `ipc.ts` registers all handlers through a single `register()` wrapper that checks the sender is the trusted main frame at the main-window URL, runs the operation, and returns an `ApiResult` envelope; thrown errors are logged as controlled codes and never sent to the renderer. DB functions return neverthrow `Result`s, converted by `toApiResult`.
- **Database** (`src/main/db/`): SQLite is main-process only. `openDatabase()` enables WAL mode and calls `runMigrations()`, which applies every missing entry of the ordered list in `migrations/index.ts` (one transaction each, recorded in `schema_migrations`). Add a migration as `migrations/NNN-*.ts` plus a new `{ version, up }` entry; never edit applied ones. Data lives in `app.getPath('userData')/school-tutor.sqlite3`.
- **Contracts** (`src/contracts/`): zod schemas and types shared by main, preload, and renderer. Every IPC payload is validated at runtime against these. `api.ts` holds the generic `ApiResult`/`ApiError` envelope; feature schemas go in their own file.
- **Preload** (`src/preload/index.ts`): exposes a small explicit `window.schoolTutor` API via `contextBridge`. Adding a feature means: contract in `src/contracts`, DB function, `register(...)` in `ipc.ts`, method in the preload `api` object (its type `SchoolTutorApi` is exported and feeds `window.schoolTutor` in `global.d.ts`; the channel string must match `ipc.ts`). Never expose generic IPC or Node APIs.
- **Renderer** (`src/renderer/`): presentation only. It reaches the main process solely through `api/settings.ts` / `window.schoolTutor`. State and actions are split into hooks (`hooks/useTutorApp.ts` composes `useAppStartup`, `useLocalization`, `useLanguageSettings`, `useProfileActions`, `useProfileForm`); `pages/` and `components/` are views; UI strings (uk/bg/en) live in `localization/messages.ts`. Renderer readiness is reported to main only after profile and language initialization succeed.
- **Diagnostics** (`src/main/local-diagnostics.ts`): allowlisted, local-only log at `userData/logs/app.log` (2 MiB rotation, 2 prior files). Never log names, profile IDs/content, raw errors/stacks, or personal paths; log failures must not crash the app.

## Invariants to preserve

- Import boundaries are enforced by `no-restricted-imports` in `eslint.config.mjs` (renderer: no Electron/Node/main/preload; contracts: zod and contracts only; main: no renderer/preload). Fix violations instead of loosening the rules.
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; production CSP has `connect-src 'none'`.
- Window callbacks close over their owning window and check `isDestroyed()` before acting.
- Native module (better-sqlite3) must be rebuilt for the target Electron and actually present in the package; webpack success or archive inspection alone is not proof.
- Age bands are chosen by the parent, never derived from school grade. Max two profiles.
- Don't claim local profile separation protects data from other users of the same OS account.
