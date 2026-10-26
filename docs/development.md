# Development

Requires Node.js 22.13 or newer and npm. Install dependencies with `npm install`, then run `npm start`. `npm run make` creates platform artifacts on the current operating system; the CI workflow builds on macOS and Windows runners.

In development, the School Tutor window opens its own detached DevTools. The renderer is served at `/main_window/index.html`; a 404 at the bare development-server root is expected.

Local structured diagnostics are written to `app.getPath('userData')/logs/app.log`. Typical locations are `~/Library/Application Support/School Tutor/logs/app.log` on macOS, `%APPDATA%\School Tutor\logs\app.log` on Windows, and `~/.config/School Tutor/logs/app.log` on Linux. The current file rotates at 2 MiB and two prior files are retained (`app.log.1` and `app.log.2`). Records contain controlled error codes and allowlisted startup metadata only. Raw errors, console output, profile content, credentials, and personal paths are excluded. Logging is local-only; the app does not upload logs. If the log directory cannot be created or written, startup continues without diagnostics.

The renderer only receives the narrow methods declared by the preload bridge. SQLite lives in the Electron main process under the platform's application data directory; no external database installation is needed. This first slice has no provider SDK, API credential, network request, or child-data upload.

The initial UI supports Ukrainian, Bulgarian, and English. Age bands are selected by the parent and are never derived from a school grade. Profile learning preferences are optional and remain local.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run make` to validate the current slice. Schema changes are ordered migrations in `src/main/db/migrations/`; the runner applies any missing versions at startup and has its own tests. The SQLite test creates a profile, closes the database, reopens it, and checks the profile and selected-profile state. Startup diagnostics report renderer readiness only after profile and language initialization; UI structure and styling are not inspected by the main process. The initial profile UI remains local-only.
