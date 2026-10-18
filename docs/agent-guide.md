# Project guide for implementation and review agents

This guide is a compact orientation layer for a fresh agent run. It records the product context, the repository's real shape, key constraints, and how to verify claims without repeatedly reconstructing them. It is not a replacement for the detailed requirements in `IMPLEMENTATION_PLAN.md` or the actual code.

## Product and intended users

School Tutor is a local desktop maths tutor for one family with two children, initially in grades 2 and 6 in Ukrainian and Bulgarian school systems. The intended first full release supports Ukrainian, Bulgarian, and English. A parent manages profiles, school enrollments, lessons, materials, approved resources, and spending. Children work through homework with questions, hints, simpler explanations, examples, and independent practice. The tutor should help children understand and produce their own reasoning rather than reveal a complete answer on demand.

The application targets macOS and Windows. Study records and managed materials are local to an installation. External AI and resource discovery are planned, but are not part of PR 1. Child-facing data handling, provider eligibility, spending enforcement, and parental controls must be resolved before live AI use. Read the requirements and explicit exclusions in `IMPLEMENTATION_PLAN.md` before proposing product behavior.

## Delivery state and scope

Work is split into sequential PRs described in `IMPLEMENTATION_PLAN.md`. PR 1 establishes the desktop shell, secure process boundary, local SQLite persistence, profile creation/selection, interface language selection, diagnostics, and packaging. It does not include AI, school enrollments, lesson management, homework, or provider credentials.

The user creates branches from `main`, adds commits, and pushes them. Do not commit or push. Do not start a later PR until the user approves the current PR. Check `docs/implementation-checklist.md` for current evidence and pending checks; checklist marks must reflect actual results. In particular, distinguish unit tests and synthetic packaged SQLite checks from actual packaged-app UI verification and target-platform CI.

## Current repository map

| Path | Responsibility |
| --- | --- |
| `src/main/index.ts` | Main-process composition, startup/lifecycle, single-instance behavior, shutdown, and database wiring. |
| `src/main/window.ts` | Secure `BrowserWindow` creation, loading diagnostics, and renderer-ready handling. |
| `src/main/ipc.ts` | Narrow IPC handlers, runtime validation, trusted-sender checks, and sanitized result envelopes. |
| `src/main/db/` | SQLite connection, migrations, profile/settings persistence. SQLite must stay in the main process. |
| `src/main/local-diagnostics.ts` | Local structured diagnostics, allowlists, IDs, rotation, and non-fatal write behavior. |
| `src/preload/` | Small typed context bridge. Expose only explicit application operations, never generic IPC or Node capabilities. |
| `src/contracts/` | Runtime-validated shared IPC inputs/results and types. |
| `src/renderer/` | React profile/language UI and styling. It talks to the app only through the preload bridge. |
| `forge.config.ts`, `webpack.*.config.ts` | Electron Forge, renderer/main builds, native module rebuild/staging, and packaged resources. |
| `scripts/check-packaged-runtime.mjs` | Packaged SQLite runtime smoke check. It validates native dependency loading and synthetic cross-process persistence; it is not an application UI or migration test. |
| `.github/workflows/package.yml` | Platform package jobs. Windows status must be reported separately from local macOS checks. |
| `docs/development.md` | Setup, run commands, local diagnostics location, and development behavior. |
| `docs/implementation-checklist.md` | Evidence-backed completed/pending PR 1 checks. |
| `IMPLEMENTATION_PLAN.md` | Full product requirements, target architecture, PR slices, and acceptance intent. |

The target architecture in the plan includes future `src/features/` and `src/infrastructure/` areas. They may not exist until their first PR consumes them. Do not create speculative layers or preemptively implement future PRs.

## Boundaries and safety invariants

- React is presentation code. It cannot import SQLite, Node APIs, filesystem access, credentials, or unrestricted Electron APIs.
- Preload exposes the smallest explicit API needed by renderer flows. Keep `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- Validate every IPC payload at runtime, validate the sender, and return a consistent sanitized result envelope. Do not send raw exception messages to the renderer.
- The main process owns lifecycle and persistent resources. Ensure startup failures, normal quit, single-instance rejection, and macOS reopen paths have deliberate cleanup behavior.
- Window callbacks must close over their owning window and check destruction before acting. Renderer readiness follows successful initialization through the bridge; a finished navigation alone is not proof that preload APIs worked.
- Packaged renderer content uses a restrictive CSP. Production has no renderer network connections (`connect-src 'none'`); development permits only the configured local Forge server connections.
- Persisted personal data stays local. Diagnostics are allowlisted, local-only, and must exclude names, profile IDs/content, credentials, raw errors/stacks, environment dumps, and personal absolute paths. Diagnostics failure must not crash the application.
- Native dependencies must be rebuilt for the target Electron/platform/architecture and actually included in the package. Do not infer packaged success from Webpack compilation or archive inspection alone.
- Never claim children’s data is protected from another person with access to the same OS account; local profile separation is application organization, not an OS security boundary.

## Working and verification approach

Inspect applicable `AGENTS.md` files, the relevant plan section, checklist, current base diff, staged and unstaged changes, and untracked files before editing. Keep fixes within the approved PR. Preserve unrelated user work. Use existing npm scripts unless a specific focused command gives stronger evidence:

```text
npm run typecheck
npm run lint
npm test
npm run make
npm run smoke:package
```

Run checks that the user requests or that are necessary to verify a change; do not add broad tests for their own sake. Report exactly which commands ran and their outcome. Packaging may require fetching an Electron artifact; if that is blocked, say so and do not present an older archive as verification of newer changes. Do not mark interactive packaged UI behavior complete without launching the current extracted app and checking profile creation/selection, language changes, and persistence after full quit/relaunch. Record inaccessible desktop or unavailable Windows CI as pending, with clear manual steps.

## Source of truth and gaps

Use this precedence when documents or code disagree:

1. The user's latest explicit direction controls the authorized scope and workflow.
2. `IMPLEMENTATION_PLAN.md` defines intended product requirements and PR acceptance scope.
3. Actual code defines current implementation behavior; tests and run results define what has been verified.
4. `docs/implementation-checklist.md` summarizes evidence and remaining gaps, but is not proof by itself.

Call out missing or conflicting requirements instead of silently inventing policy, especially for child data, external providers, credentials, network access, retention, and parent authorization. Keep suggested corrections proportional to the current PR.
