# Implementation checklist

## PR 1 — Runnable desktop application with persisted profiles

- [x] Electron Forge, React, TypeScript, SQLite, contracts, and app shell scaffolded.
- [x] Main/preload/renderer boundary with context isolation, sandboxing, disabled Node integration, restrictive CSP, and sender validation.
- [x] CSP build output verified: development allows the configured Forge server connection; production HTML uses `connect-src 'none'`.
- [x] Versioned SQLite migration, two local child profiles, persisted UI language, and Ukrainian/Bulgarian/English controls.
- [x] Single-instance lock and macOS/Windows ZIP package workflow.
- [x] Focused synthetic profile contract and SQLite close/reopen tests added and passed.
- [x] Dependency lockfile generated and present in the working tree; runtime dependency audit reports zero advisories.
- [x] Typecheck, lint, and tests pass.
- [x] Development BrowserWindow opens DevTools; startup source reports loading errors and accepts a validated renderer-ready signal only after successful profile and language initialization.
- [x] Local startup diagnostics initialize before the database module, use run/correlation IDs and allowlisted structured fields, rotate at 2 MiB with three total files, and never upload logs.
- [x] Synthetic diagnostics test verifies raw errors, console output, profile content, credentials, personal paths, and unknown fields are dropped; logging failures do not throw.
- [x] Forge keeps `better-sqlite3` external, copies its JavaScript and `node-addon-api` into the Webpack staging app, forces Electron native-module rebuild, and unpacks native binaries with `AutoUnpackNativesPlugin`.
- [x] A previous macOS arm64 ZIP and packaged SQLite smoke check passed before the current review fixes.
- [x] Rebuilt the macOS arm64 ZIP with the current changes after retrying the Electron artifact download with network access; the packaged SQLite smoke check passed. It validates native SQLite resolution and synthetic persistence only; it does not launch the application or exercise migrations/IPC/window behavior.
- [x] Preload diagnostics record `error_not_observed` after page load if no preload error event was observed; the validated `renderer.ready` event records successful initialization through the bridge.
- [ ] Interactive profile creation, language selection, and restart persistence in the extracted window remain unverified: this execution environment could not capture a desktop display (`screencapture: could not create image from display`). Keep PR 1 open until this is confirmed on a desktop session.
- [x] Windows build support added in code: named Squirrel maker config (`SchoolTutorSetup.exe`), Squirrel install/update/uninstall launch handling in `src/main/squirrel-startup.ts` (unit-tested), and a cross-platform `smoke:package` (PE/Mach-O architecture check, `.exe`/`resources` layout) that CI now runs on Windows too.
- [ ] Windows `npm run make`, `smoke:package`, installer install/launch/uninstall, and shortcut creation remain unverified: nothing was run on Windows. Confirm on the Windows CI runner and a real Windows machine.

## Deferred plan gaps and release checks

- Provider eligibility, under-13/age-of-digital-consent data handling, and compatible web search remain live-use blockers as written in `IMPLEMENTATION_PLAN.md`.
- Target Windows version/architecture and release signing path remain to be confirmed before a family release.
- The full development dependency audit still reports six high advisories in the Webpack dev-server dependency tree. `npm audit --omit=dev` is clean. The flagged `braces@3.0.3` package has no upstream patched release yet; these tools are excluded from packaged runtime dependencies. Recheck before using the development server on untrusted networks.
