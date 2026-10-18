
# Task: Family Maths Tutor — local desktop MVP

## Objective

Build a small desktop tutor for a Ukrainian family with two children, initially in grades 2 and 6, attending Ukrainian and Bulgarian schools. Help each child understand the current maths lesson and complete homework through questions, hints, simpler explanations, concrete examples, and independent practice. Recommend useful videos and other resources matched to the lesson, grade, and language.

The application runs locally on macOS and Windows. Lessons, materials, conversations, and progress are stored locally. AI inference and resource discovery initially use external APIs and require internet access. Use Electron, React, TypeScript, and SQLite in one repository. Optimize for a parent maintaining a family application.

This document is an implementation specification for Codex, not a claim that an application or repository already exists. Proposed paths below are the target structure. No implementation repository was supplied or inspected.

## Confirmed Scope and Working Assumptions

### Confirmed by the parent

- Two children, initially in grades 2 and 6; Ukrainian and Bulgarian schools.
- First usable release covers maths for both children and both schools.
- Ukrainian, Bulgarian, and English support.
- Materials arrive as a mixture of photos, PDFs, and links.
- The tutor guides children toward answers and simplifies explanations when necessary.
- Preserve school, subject, lesson, and learner context across sessions.
- Discover relevant videos and other internet materials.
- Desktop installation on macOS and Windows; simple maintenance.
- TypeScript stack. Voice and push-to-talk are excluded from this MVP.

### Defaults that can be changed without redesign

- Each child uses a primary computer. Installations have independent databases; transfer is by backup/restore, without merging.
- One family can keep both profiles on one installation. A parent PIN protects administrative actions inside the app.
- Parents create and order lessons from actual school materials. There is no automatic connection to school portals or automatic knowledge of classroom progress.
- Children can attach homework to an existing lesson and confirm recognized task text. Parents approve lesson materials and video recommendations.
- The parent starts with a family API spending target of USD 20/month, manually divided between installations when necessary.
- OpenAI is the first intended AI adapter, subject to its requirements for serving children. An in-process fixture adapter supports development without live calls.
- Exact ages, grades in each school, academic years, device architectures, and language preferences are entered during setup. Do not infer a child's age from grade.
- The source example's document structure is reused. PR estimates here are planning ranges; implementation must follow any actual repository size limits and AGENTS.md rules.

## Requirements

### Functional

- **R1 — Separate child profiles.** Support two independent profiles with configurable age band, preferred explanation language, and learning preferences. A session, material, or progress query must always resolve its owning child. Siblings' conversations and progress must remain separate.
- **R2 — School context.** A child can have Ukrainian and Bulgarian school enrollments, each with its own grade and academic year. The same child may have different grades or lesson sequences in the two schools. Support a maths subject within each enrollment.
- **R3 — Ordered lessons.** Parents create, edit, order, and mark current lessons. Each lesson has a title, school-language label, topic description, optional prerequisite notes, and materials. The tutor uses the selected school's current material and methods. A related concept may be manually linked across schools; do not automatically equate entire lessons or completion states.
- **R4 — Photos and PDFs.** Import local JPEG/PNG photos and PDF files, retain originals, preview pages, and select only the exercise or pages needed. Support scanned PDFs by rendering selected pages as images. Extract embedded PDF text locally when available, but preserve visual layout for maths interpretation. Never send an entire textbook automatically.
- **R5 — Links.** Save HTTPS links with a parent-editable title, language, and lesson association. Support explicit import of readable public article text. Unsupported, protected, script-dependent, video, or failed pages remain usable references; allow pasted excerpts or screenshots. Do not require logins, scrape school accounts, or promise universal web-page extraction.
- **R6 — Task confirmation.** AI recognition produces an editable task draft and flags uncertain symbols or missing information. Show the original beside recognized content. Require confirmation before tutoring, especially for signs, denominators, decimals, and handwritten digits. Source materials may contain worked solutions; exclude answer keys and unrelated exercises from the child's active task context where practical.
- **R7 — Guided tutoring.** Ask one meaningful question at a time. Assess the child's attempt, give a focused hint, and wait. Do not reveal the original exercise's final answer or a complete solution on request. The tutor can confirm a correct answer already supplied by the child and recap the child's completed reasoning.
- **R8 — Adaptive explanation.** Match vocabulary, reading length, and step size to the configured child and observed response. An explicit “Explain more simply” action or repeated difficulty changes the teaching approach: smaller substep, everyday example, analogous solved exercise with different values, or prerequisite practice. Persistent difficulty offers a pause or parent help rather than an endless question loop.
- **R9 — Maths correctness.** Verify supported numeric calculations with a restricted arithmetic evaluator. Do not mark an arbitrary proof, geometry explanation, or word-problem interpretation as deterministically verified. Express uncertainty and request parent review when the available material does not establish the expected method or answer.
- **R10 — Three language roles.** Configure interface language, explanation language, and required homework language independently using `uk`, `bg`, and `en`. Preserve the textbook's original terms and optionally show a short equivalent in the explanation language. Help the child formulate their own reasoning in the homework language after understanding it. Language switching does not change the selected school or lose session state.
- **R11 — Durable session context.** Resume the selected exercise, child attempts, hints, teaching stage, and next step after restart. Context sent to AI contains the selected lesson and bounded relevant history, rather than every school conversation.
- **R12 — Evidence of learning.** Record supported attempts separately from independent attempts. At lesson end offer a comparable new exercise and a short recap. Store dated evidence and observed difficulties; distinguish “homework finished,” “needs support,” and “demonstrated independently.” An AI summary is not proof of mastery.
- **R13 — Relevant resources.** Discover up to three video or article candidates for the selected topic, grade band, and language. Include actual source URLs, source title, relevance explanation, available metadata, and an evidence label. Let parents approve, reject, add manually, and reuse resources. Child requests search the approved collection first; new discoveries enter parent review.
- **R14 — Video learning loop.** Open approved videos in the default browser. Preserve the lesson and offer a follow-up question when the child returns. Video playback or clicking “I watched it” must not count as evidence of understanding. Transcript-based questions require an actual transcript; otherwise ask a topic-based question without claiming it came from the video.
- **R15 — Parent controls.** Parents manage profiles, enrollments, lesson order, approved resources, credentials, model settings, and budgets. The dashboard shows recent activity, support needed, independent evidence, and estimated spending. A local PIN is a household UI safeguard, not protection against someone editing files under the same OS account.
- **R16 — Cost visibility and limits.** Meter extraction, tutoring, practice generation, and discovery. Reserve an estimated maximum cost before a request, reconcile returned usage, and stop new paid work when the installation's allocation is exhausted. Budget enforcement must cover tool calls and internal retries. Explain that this is a local estimate and cannot enforce a global provider-account ceiling.
- **R17 — Backup and recovery.** Export a consistent, versioned snapshot containing study data and files. Restore by replacing the local study dataset after validation and an automatic pre-restore backup. Exclude provider credentials and the parent PIN; destination setup remains local. Preserve spending history conservatively. Do not merge live SQLite files across computers.
- **R18 — Useful offline behaviour.** Without connectivity or when spending is paused, allow reading imported materials, viewing saved conversations and progress, editing parent-managed records, and using already saved exercises. Preserve unsent child input. Show a clear retry path for features that require AI or external video playback.

### Non-Functional

- **N1 — One application.** One repository, one desktop application, one local SQLite database plus managed files per installation. No separate web server, Docker requirement, hosted backend, or database service for the MVP.
- **N2 — Maintainable boundaries.** Feature functions and small adapters; share runtime-validated contracts across IPC. Introduce classes or services only where state, lifecycle, or a meaningful integration boundary requires them. Do not introduce an agent framework, vector database, or provider plugin platform preemptively.
- **N3 — Explicit failures.** Use `neverthrow` Result/ResultAsync at application and external-I/O boundaries, with typed error codes. Serialize IPC failures as plain data. No swallowed failures or unhandled rejected promises. Keep the initial project on one error-handling approach.
- **N4 — Desktop isolation.** Render packaged application content with context isolation and sandboxing, Node integration disabled, a restrictive CSP, validated IPC senders and payloads, and a narrow preload API. Credentials, filesystem access, databases, and paid requests remain outside the renderer. Sanitize generated Markdown; disallow raw HTML and arbitrary remote execution.
- **N5 — Minimize data exposure.** Keep identifying profile information locally. Send only necessary task context, age band, and language settings. Provide crop/redaction before image upload. Do not log child conversation text, textbook pages, API keys, or full prompts by default. Local storage and pseudonyms do not by themselves make API traffic anonymous or eligible for a particular retention policy.
- **N6 — Responsive interaction.** Run expensive PDF rendering and extraction outside the UI thread. Provide visible loading, cancel, and retry actions. Cancellation stops subsequent steps; explain internally that a submitted request may still be billable. Prefer validated complete replies for the initial small tutoring turns; no unvalidated streaming text shown to children.
- **N7 — Recoverable persistence.** Use versioned migrations, foreign keys, transactions, request identifiers, and a single-instance lock. Persist attempts before requesting AI. Avoid duplicate visible replies or progress evidence after double-clicks, timeouts, restart, or stale responses.
- **N8 — Cross-platform delivery.** Produce installable builds and test on actual target macOS and Windows architectures. Account for SQLite native-module packaging. Students must be able to launch installed builds without Node.js or Python installed separately.
- **N9 — Focused verification.** Test state changes, scope isolation, arithmetic correctness, IPC authorization, restore, and cost handling. Use synthetic/de-identified fixtures for live model evaluation. Include child-appropriate content handling and a parent help path.

## Out of Scope

- Voice, speech recognition, speech synthesis, always-on audio, or pronunciation coaching.
- Automatic synchronization, simultaneous shared family state, cloud accounts, and school-portal integration.
- Subjects other than maths in the first usable release.
- Whole-textbook ingestion, embeddings, semantic search infrastructure, automated curriculum mapping, fine-tuning, and multi-agent orchestration.
- Handwriting grading, a full drawing canvas, automatic notebook correction, and universal symbolic maths/proof checking.
- Hosting, downloading, editing, or redistributing videos; browser automation or scraping video transcripts.
- Guaranteed prevention of answer leakage, guaranteed learning outcomes, or replacement of parents and teachers.
- A commercial multi-family service, enterprise administration, and automatic desktop updates.

## Current State

The agreed product scope is documented above. The supplied `Pasted text.txt` is a formatting and planning reference for a different backend feature. There is no inspected starter application, package manifest, migration history, test suite, or configured provider account for this tutor.

Codex must inspect the actual target checkout and applicable AGENTS.md files before implementing. If a repository already exists, reconcile the proposed structure with its conventions instead of scaffolding over existing work. Record actual dependency versions and scripts after scaffolding; do not invent successful checks or measured diff sizes.

## Target State

A parent configures the app, adds both children and school enrollments, creates the current maths lessons, and imports relevant material. The child opens a lesson, selects or attaches homework, reviews recognized task text, and works with the tutor through small steps. The app keeps the active lesson and learning evidence locally. A child can request a simpler explanation or an approved video, then try a related exercise independently.

Parents can review difficulties, approve newly discovered resources, adjust the budget, and make a backup. macOS and Windows installations operate independently. Cloud features require a configured provider and an appropriate account/data-handling arrangement for child use.

## Affected Areas

Proposed single-package layout; create each area when its first feature consumes it:

| Area                        | Responsibility                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `src/main/`               | App lifecycle, narrow IPC handlers, parent authorization, composition root              |
| `src/preload/`            | Typed context bridge; no generic invoke, filesystem, or shell API                       |
| `src/renderer/`           | React screens, localized controls, accessible maths rendering                           |
| `src/contracts/`          | Zod input/output schemas, inferred DTOs, plain error envelopes                          |
| `src/features/study/`     | Profiles, enrollments, lessons, homework ownership                                      |
| `src/features/materials/` | File imports, selected PDF pages, link references, recognition                          |
| `src/features/tutoring/`  | Teaching policy, state transitions, context builder, prompt versions                    |
| `src/features/progress/`  | Independent/support evidence and parent summaries                                       |
| `src/features/resources/` | Discovery, evidence labels, parent approval, saved links                                |
| `src/infrastructure/`     | SQLite, migrations, files, credentials, AI adapter, usage ledger, backups               |
| `tests/fixtures/`         | Synthetic exercises, page images, expected numeric results, model-evaluation cases      |
| `docs/`                   | Setup, architecture decisions, provider prerequisites, release and restore instructions |

Use ordinary imports and dependency injection through function parameters. A feature should not import React, Electron APIs, or a provider SDK. Renderer imports are restricted to presentation and contracts. Avoid a generic repository framework or dependency-injection container.

## Technical Design

### Runtime and dependency choices

- Electron Forge with its TypeScript/Webpack template, React, and strict TypeScript settings. Use supported versions at implementation time and commit the lockfile.
- SQLite through `better-sqlite3`, consumed only in the main process for short transactions. Keep SQL migrations explicit and verify native binaries in packaged builds early.
- Zod for IPC and AI contracts; `neverthrow` for explicit boundary errors.
- PDF.js for selected-page preview/rendering and available embedded-text extraction. Large work runs in a worker/utility process when needed.
- KaTeX or another established maths renderer, with untrusted HTML disabled. Start with typed text answers and fractions/signs entered through simple text controls.
- Official OpenAI Node SDK behind the first `AiGateway` adapter. Use the current Responses API capabilities validated against official docs. Pin a tested model identifier and versioned prompt; do not rely on an automatically changing “latest” alias.
- Basic JSON translation dictionaries for fixed UI strings. Use the requested output-language fields for model text. Do not translate imported textbook content automatically on every view.
- Unit/integration runner appropriate to the scaffold, plus a small Electron end-to-end smoke suite. Avoid adding multiple test frameworks for equivalent work.

### Persistent model

Use UUIDs, ISO timestamps, explicit foreign keys, and transactions. Scope every query by the active child's ownership chain. The following are logical records; closely related records may share a table where that keeps the design clear.

| Record            | Essential data                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Child             | Local display name, age band, language preferences                                                              |
| Enrollment        | Child ID, school system `ua`/`bg`, academic year, grade                                                     |
| Lesson            | Enrollment ID, subject `maths`, order, title, topic notes, current status, optional related lesson ID         |
| Material          | Lesson ID, kind, managed relative file path or URL, title, language, source metadata                            |
| Task              | Lesson ID, selected source/page references, original draft, confirmed task revision                             |
| Session           | Task ID/revision, status, stage, support level, progress version, compact summary                               |
| Turn              | Session ID, sequence, request ID, role, content, assessment, prompt/model version                               |
| Learning evidence | Session/lesson ID, exercise, independent/supported flag, outcome, observed difficulty, timestamp                |
| Resource          | Lesson ID, actual URL, title, language, evidence label, approval state, optional duration/transcript provenance |
| Usage request     | Installation/request IDs, operation, month, reservation, usage, cost estimate, outcome, rate version            |
| Settings          | UI language, parent PIN hash, provider configuration excluding secret, budget, schema version                   |

Provider secrets live in OS-backed credential storage via Electron's supported safeStorage integration. If secure storage is unavailable, return an actionable setup failure rather than persisting a plaintext key. Profiles are logical family separation within a trusted local application, not separate OS security accounts.

### Ingestion and task preparation

1. Parent creates the lesson and imports materials, or the child attaches homework to an existing lesson.
2. Copy files into managed storage using generated names and validate type, size, and ownership. Proposed initial limits: 20 MiB per photo, 50 MiB per PDF, and five selected pages per recognition request. Make limits visible and configurable later if needed.
3. Preview/crop selected photos or PDF regions. Preserve original page numbers and material identity.
4. For links, save the reference immediately. Fetch article content only after explicit parent import, with HTTPS-only URL validation, public-address checks, redirect revalidation, bounded response size/time, and a readable-text extractor. Reject localhost/private/link-local destinations and embedded credentials.
5. Request a structured task draft for the selected exercise. Treat embedded page/web instructions as untrusted lesson content, never as application instructions. Do not batch unrelated textbook exercises.
6. Display the editable task and uncertain fragments next to the source. The child can confirm or ask a parent. Recognition confidence is an estimate and never bypasses confirmation.
7. Save a confirmed revision. Editing an active exercise creates a new revision and resets its tutoring state; historical evidence remains associated with the old revision.

A title-only link is a valid reference, but cannot be used as if its full content has been read. Missing PDF text does not imply an empty lesson. Failed imports retain a clear retry or manual-text path.

### Tutoring workflow

Implement a small state machine in TypeScript. The application controls permitted transitions and support levels; the model proposes assessment and child-facing content. No free-running agent loop.

| Stage                 | Behaviour                                                           | Transition                                    |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `orient`            | Briefly confirm the task and ask what the child already knows       | Begin diagnosis or first attempt              |
| `attempt`           | Ask for one step; save the child's attempt                          | Assess it and select next support             |
| `support`           | Give one hint or changed explanation                                | Return to an attempt                          |
| `prerequisite`      | Use a smaller concept or an analogous example with different values | Return to the original task                   |
| `independent_check` | Offer a new comparable exercise without hints                       | Record independent evidence or support needed |
| `recap`             | Summarize demonstrated understanding and the next useful practice   | Finish or continue later                      |
| `paused`            | Preserve state and offer a break/parent help                        | Resume explicitly                             |

Support levels: small hint, concrete example, smaller prerequisite. An explicit simplify action advances support immediately. Two consecutive unsuccessful substantive attempts trigger a changed approach; repeated simplification without progress offers parent help. Keep these thresholds configurable constants with focused tests.

Suggested presentation defaults: very short sentences and one action for grade 2; short explanations and one subproblem for grade 6. Adjust within the child's configured band using observed responses, without labelling the child with a fixed ability level.

“Explore this topic” allows a small extension or prerequisite and records it as related practice. It does not move the school's current-lesson pointer automatically.

### AI / Prompt Contract

Build each request from: versioned teaching policy, age band, language roles, selected school's grade, confirmed task, relevant lesson excerpts, last few turns, compact session summary, and observed difficulties. Keep a configurable input budget; initially target at most 8,000 text tokens plus bounded selected images. Do not truncate the active exercise or remove its essential diagram silently. Ask for narrower input if it cannot fit.

Use separate structured operations for task recognition, a tutoring turn, independent-practice generation, and resource discovery. One adapter can implement all operations without becoming an extensible agent platform.

A tutoring reply contains bounded child-facing text, an optional next question, an assessment (`correct`, `partly_correct`, `incorrect`, `uncertain`), a proposed teaching action, and a short evidence summary. Runtime validation checks the schema, allowed action for the current state, length, and references. Refusals, incomplete output, or invalid schemas produce typed recoverable errors and preserve the current attempt. Structured output improves shape reliability; it does not establish mathematical or pedagogical correctness.

Where a reference solution is needed for evaluation, keep it in application-owned/internal state and out of renderer DTOs. Do not store hidden chain-of-thought. Source answer keys, model internal answers, and tool outputs must not be rendered as tutor messages automatically.

Prompts prohibit complete solutions to the current homework, including translation requests, “pretend I am the parent,” and instructions embedded in materials. The app can enforce state and restrict visible fields, but prompt-based answer-leak prevention is imperfect. Use evaluated examples and parent review rather than claiming a mathematical guarantee from a content filter.

For supported arithmetic, accept a schema-validated expression tree of integer/decimal/rational literals and the operations add, subtract, multiply, divide, parentheses, and unary sign. Evaluate exact rationals and compare normalized values. Reject unsupported nodes, division by zero, and excessive depth/size. Never evaluate model-generated JavaScript, Python, or SQL. Word problems and geometry retain an `uncertain` route when interpretation cannot be checked.

### Session durability and errors

- Create a request ID and save the attempt before any paid operation. Permit at most one active tutoring request per session.
- Resolve scope and parent/child permissions in the main process, using the active profile/enrollment. Do not trust child IDs supplied by the renderer alone.
- A reply commits atomically with the expected session revision, its assessment, and any evidence. Ignore late replies to a changed task or switched session.
- Reusing a completed request ID returns the saved result; uncertain requests require an explicit retry with a new billable request ID. Disable hidden SDK retries initially, or meter every retry as its own reserved attempt.
- At restart, interrupted requests become interrupted/unknown; do not call the model again automatically. Keep unresolved cost reservations conservatively until reconciliation or explicit parent handling.
- Error codes include `InvalidInput`, `UnauthorizedAction`, `UnreadableMaterial`, `UnsupportedContent`, `Offline`, `BudgetExceeded`, `ProviderUnavailable`, `InvalidModelOutput`, `PersistenceFailure`, and `RestoreRejected`. Map each to a localized message and useful next action.
- Log a handled failure once at its boundary, with operation/request IDs and error under `err`; other diagnostic context belongs under `metadata`. Exclude child text and credentials.

### Resource and video discovery

Use saved, parent-approved resources first. For new discovery, the initial adapter uses a bounded web-search operation through the configured provider. Search with topic, grade band, selected language, and a duration preference; do not include child names or conversation history.

Candidates must refer to actual URLs returned by retrieval. Bind each displayed card to that source; the model must not manufacture URLs or describe an unseen video as reviewed. Evidence labels are `metadata_only`, `description_checked`, and `transcript_checked`, based on content actually obtained. Unknown language, duration, or suitability stays unknown until reviewed.

Prefer short, focused explanations; treat duration as a ranking preference rather than a rigid rule. Parents preview candidates externally and approve the exact resource. Approval stores a review timestamp and does not guarantee future external content, ads, or recommendations. Open validated approved HTTPS URLs in the browser; no embedded remote browser with desktop privileges. Handle changed/unavailable links by hiding or replacing them.

No transcript scraper or YouTube Data API is needed initially. If a video transcript is unavailable, make topic-based follow-up questions. If the provider search feature is unavailable under the chosen account/data arrangement, manual resource links remain usable; record live discovery as blocked rather than silently claiming it is implemented.

### Spending model

The initial USD 20/month is a family planning target. With two independent machines, parents can allocate USD 10 to each. With one machine, allocate USD 20 there. Display each installation's own allocation and usage; there is no synchronized family total.

Maintain a local monthly ledger in the installation's configured timezone. Use versioned rate data for the selected model, image inputs, output/reasoning limits, and permitted search calls. Before a paid request, reserve a conservative amount transactionally; refuse if a required rate/limit is unknown. Reconcile against returned usage where available. Include generated practice and failed/retried requests. Search call counts and maximum model output are bounded by application configuration.

Prices and provider billing can change. Local estimates cannot control calls made outside this installation, another installation, provider-side uncertainty, or an out-of-date rate configuration. Show that limitation in parent settings. Parent reconfiguration is explicit; children cannot bypass a budget pause by changing profiles.

### Backup and restore

Use SQLite's supported snapshot/backup mechanism or a properly closed consistent database, including committed WAL contents. Take the snapshot while writes are paused and copy referenced managed files into a versioned archive with a manifest and file hashes. Warn that exports contain private study data and are not encrypted in the initial format.

On restore, validate the manifest, hashes, schema compatibility, relative paths, archive limits, and file types before replacing anything. Prevent path traversal and symlink extraction. Create a pre-restore snapshot and make replacement recoverable if any step fails. A newer unsupported schema is rejected.

Keep destination credentials, parent PIN, installation identity, and budget configuration. Retain destination usage records and conservatively union imported request IDs/cost records so restoration does not reset recorded spending. Restoring a source installation's history may overcount destination spending; show the outcome to the parent. This does not provide global cross-device accounting or merging of study histories.

## Key Decisions

| Decision         | Choice and reason                                                               | Trade-off                                                            |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Desktop runtime  | Electron/React/TypeScript matches the parent's skills and keeps one language    | Larger distribution and native-module packaging work                 |
| Persistence      | SQLite and managed local files make sessions durable with little infrastructure | No automatic cross-device state                                      |
| School alignment | Parent-maintained ordered lessons grounded in supplied material                 | Parents must update the current topic                                |
| Learning state   | Evidence belongs to a child; lesson completion belongs to its school context    | Cross-school equivalence needs deliberate links                      |
| Tutoring         | Explicit transitions and bounded model calls                                    | Less autonomous exploration; easier recovery and review              |
| Error handling   | `neverthrow` at external/application boundaries, ordinary feature functions   | Less built-in orchestration than Effect, sufficient for the MVP      |
| Retrieval        | Select pages and store approved links                                           | More manual selection; avoids whole-book indexing                    |
| Videos           | Discover candidates, parent review, open externally                             | Parent effort and no control over external player content            |
| AI provider      | One implemented adapter and a fixture implementation                            | Live use depends on account capabilities and child-data requirements |
| Delivery         | Manual installer updates and versioned migrations                               | Parent performs updates and backups                                  |

## Implementation Plan

1. Inspect the target checkout and AGENTS.md; establish actual scripts and compatible dependencies. Record any deviations from this plan.
2. Prove the packaged desktop shell and SQLite work on both operating systems early. Preserve that smoke check throughout development.
3. Implement the vertical PR slices below. Add contracts and abstractions alongside their first consumer; each PR should run and expose its completed behaviour.
4. Start with fixture data and the fixture AI adapter. Resolve provider prerequisites before sending real children's data or running a live family pilot.
5. Ship the complete maths MVP after the model-evaluation, restore, and platform checks pass. Intermediate PRs may be reviewed independently but are not claims that all requirements are complete.

## Chained PR Plan

Estimated changes include code and focused tests, excluding generated lockfiles and build output. They are ranges for planning, not measured diffs. Split an oversized PR at a consumed behaviour boundary, keeping types, migrations, and their first consumers together. Follow a stricter cap if the actual repository requires one.

### PR 1 — Runnable desktop application with persisted profiles

**Goal:** Establish a real application and verify local persistence and packaging.

**Scope:** Scaffold Forge/React/TypeScript, secure the window/preload boundary, add SQLite migration handling and the first profile table, and implement a localized profile create/select screen. Add a single-instance lock and a basic package job for each target OS.

**Commit message:** `feat: add desktop tutor shell and persisted child profiles [P1]`

**Estimated diff:** 450–750 changed lines.

**Likely areas:** App/Forge configuration, `src/main/`, `src/preload/`, contracts, initial database migration, profile screen, UI translation keys.

**Behaviour after this PR:** An installed application opens, creates/selects a child profile, and preserves it after restart. Fixed controls support all three UI languages.

**Depends on:** None.

**Validation:** Profile restart test, runtime-invalid IPC rejection, renderer isolation check, clean machine launch, native SQLite packaging smoke on macOS and Windows.

**Review focus:** A working persisted feature consumes the infrastructure; secrets/filesystem are not exposed to React. Record any untested target architecture.

**Out of scope:** AI, school records, and homework.

### PR 2 — Parent setup and school-specific lesson organization

**Goal:** Model each child's two schools and current maths lessons.

**Scope:** Add parent PIN setup/unlock in the main process, enrollment grades/years, ordered maths lessons, current lesson selection, language roles, and optional manual related-lesson links. Protect administrative mutations. Scope reads and child session access by ownership.

**Commit message:** `feat: organize school maths lessons and parent settings [P2]`

**Estimated diff:** 400–700 changed lines.

**Likely areas:** Study feature, settings, enrollment/lesson migrations, parent and child navigation, IPC authorization.

**Behaviour after this PR:** Both children can select their own Ukrainian/Bulgarian maths space; parents maintain separate lesson sequences and grade settings.

**Depends on:** PR 1.

**Validation:** Four enrollment fixtures, different grades between schools, current lesson persistence, child A/child B query isolation, unauthorized parent mutations, language switching without selection loss.

**Review focus:** Scope cannot be changed by a forged renderer identifier; PIN checks live outside the renderer.

**Out of scope:** Automatic school integration or inferred curriculum.

### PR 3 — Photo materials and manually confirmed homework

**Goal:** Make actual lesson photos usable before AI integration.

**Scope:** Import validated photos to managed storage, preview/crop a selected task, create editable homework text, save source references and confirmed task revisions. Allow child homework attachments within the active lesson and parent-managed teaching materials.

**Commit message:** `feat: attach lesson photos and confirm homework tasks [P3]`

**Estimated diff:** 350–600 changed lines.

**Likely areas:** Materials feature, task migration/contracts, managed-file adapter, photo/task screens.

**Behaviour after this PR:** A child can open the correct lesson, attach a homework photo, and save a confirmed exercise by entering text manually.

**Depends on:** PR 2.

**Validation:** File signature/size rejection, invalid path handling, ownership, persisted crops/source references, editing a confirmed task creates a new revision.

**Review focus:** Files are copied safely and resolving a material ID cannot access arbitrary local files.

**Out of scope:** AI recognition, PDFs, and tutoring.

### PR 4 — Selected PDF pages and public-link materials

**Goal:** Complete the agreed input formats with explicit fallback behaviour.

**Scope:** PDF preview/page selection and local text extraction; render selected scanned pages. Add titled link references, explicit parent public-article import, safe network fetch limits, and pasted-text fallback. Keep video links as references.

**Commit message:** `feat: import selected PDF pages and lesson links [P4]`

**Estimated diff:** 450–750 changed lines; split PDF and article import if needed.

**Likely areas:** PDF worker/rendering, source contracts, article-text adapter, material screens.

**Behaviour after this PR:** Photos, PDF regions, readable article excerpts, and link references can ground confirmed homework tasks.

**Depends on:** PR 3.

**Validation:** Embedded-text and scanned PDF fixtures; corrupt/encrypted/oversized files; selected-page limits; public URL success; private address and redirect rejection; fetch timeout and unsupported-page fallback.

**Review focus:** No automatic whole-book upload; no authenticated scraping; extraction failure does not erase the original/reference.

**Out of scope:** Full-textbook indexing or universal website extraction.

### PR 5 — Metered AI task recognition

**Goal:** Add the first real provider-backed operation with safe settings and budget handling.

**Scope:** Introduce the consumed AI gateway and fixture adapter, parent-only key/model configuration, OS-backed secret storage, request ledger/reservations, rate configuration, and structured recognition of selected task images/excerpts. Recognition remains an editable draft until confirmed. Document provider prerequisites and use synthetic fixtures for integration work.

**Commit message:** `feat: recognize homework with metered AI requests [P5]`

**Estimated diff:** 500–800 changed lines; split metered parent recognition preview from additional recognition formats if needed.

**Likely areas:** Provider/credential/usage infrastructure, recognition contracts/prompts, task preview, parent AI settings.

**Behaviour after this PR:** Configured parents can use metered recognition; children receive the existing confirmation step rather than an automatically accepted exercise. Fixture mode works without credentials.

**Depends on:** PRs 3–4.

**Validation:** Budget exhaustion before submission, concurrent reservations, missing rates, unknown billing outcomes, key-storage failure, offline/invalid/refused output, uncertain signs and fractions, confirmation required.

**Review focus:** Every provider attempt has a reservation; SDK retries cannot generate unmetered work; credentials stay outside renderer DTOs.

**Out of scope:** Tutoring, discovery, and real-child live testing before provider prerequisites are resolved.

### PR 6 — Resumable guided tutoring

**Goal:** Deliver the first complete homework conversation.

**Scope:** Implement session/turn persistence, bounded context construction, versioned teaching policy, validated reply DTOs, orient/attempt/support/pause transitions, parent help, and a basic one-question tutoring UI. Persist attempts before external calls and handle stale replies, double submission, interruption, and restart.

**Commit message:** `feat: add resumable guided maths tutoring [P6]`

**Estimated diff:** 450–750 changed lines.

**Likely areas:** Tutoring feature, session/turn migrations, AI tutoring operation, conversation screen, IPC handlers.

**Behaviour after this PR:** A child works on a confirmed task through small hints and can resume the same task after restart. The tutor respects school and language context.

**Depends on:** PR 5.

**Validation:** State transition tests; exactly one visible reply per request; saved attempt on failure; restart without auto-replay; task revision and profile switches; bounded context; simple answer-demand evaluation fixtures.

**Review focus:** Only validated child-facing content crosses IPC; all paid operations use the same metering boundary.

**Out of scope:** Independent mastery evidence and broad maths verification.

### PR 7 — Simpler explanations and supported arithmetic checking

**Goal:** Handle confusion constructively and reduce arithmetic mistakes.

**Scope:** Add support-level policy, simplify action, prerequisite/analogous-example transitions, grade-sensitive reply limits, bounded exact-rational evaluation, and uncertainty handling. Separate internal reference information from child-facing DTOs.

**Commit message:** `feat: adapt maths hints and verify supported arithmetic [P7]`

**Estimated diff:** 350–650 changed lines.

**Likely areas:** Teaching policy, restricted arithmetic evaluator, numeric contracts, prompt fixtures, simplify controls.

**Behaviour after this PR:** Repeated difficulty changes the explanation; unsupported interpretation leads to uncertainty/parent help. Supported signed-number and fraction calculations receive deterministic checks.

**Depends on:** PR 6.

**Validation:** Negative signs, subtraction of negatives, fractions, mixed numeric representations, decimal normalization, division by zero, oversized expression trees, malicious AST nodes, repeated difficulty, and answer-leak adversarial examples.

**Review focus:** No code execution, no claim of universal correctness, no internal solution sent to the renderer, no endless hint loop.

**Out of scope:** Symbolic proof engines, handwriting grading, and universal geometry validation.

### PR 8 — Independent practice and learning evidence

**Goal:** Distinguish completing homework from demonstrating understanding.

**Scope:** Add bounded comparable-exercise generation, independent-check and recap stages, evidence records, observed-difficulty summaries, optional related-topic practice, and a basic parent progress view. Validate generated numeric exercises with the supported evaluator where applicable.

**Commit message:** `feat: record independent maths practice and progress [P8]`

**Estimated diff:** 350–600 changed lines.

**Likely areas:** Progress feature, evidence migration, practice operation, recap/progress screens.

**Behaviour after this PR:** Parents see what was solved with support and what was demonstrated independently; related school lessons keep separate completion states.

**Depends on:** PR 7.

**Validation:** Hint usage removes independent status; restart/retry cannot duplicate evidence; incorrect generated tasks are rejected; video playback does not create evidence; cross-school links do not auto-complete lessons.

**Review focus:** Evidence has provenance and uncertainty; no unsupported “mastered” scores or automatic grade promotion.

**Out of scope:** Spaced-repetition scheduling, grade prediction, and analytics dashboards.

### PR 9 — Discover, approve, and reuse lesson videos

**Goal:** Provide useful external explanations connected to the actual topic.

**Scope:** Add manually saved resources and approval first, then metered web discovery of up to three source-grounded candidates. Record evidence labels and unknown metadata honestly. Child resource requests return approved matches or a parent-review request. Open approved URLs externally and offer a topic-based follow-up on return.

**Commit message:** `feat: discover and approve lesson videos and resources [P9]`

**Estimated diff:** 400–700 changed lines.

**Likely areas:** Resources feature, discovery adapter/contract, review queue, resource cards, external-link handler.

**Behaviour after this PR:** A lesson has reusable approved explanations; new AI discoveries are reviewable and source-backed. Manual resources work even if live search is unavailable.

**Depends on:** PRs 5 and 8.

**Validation:** Invented URL rejection, source/card binding, wrong/unknown language, unavailable transcript, parent approval, cached reuse, bounded search costs, no results, removed resource, safe external-open rejection.

**Review focus:** Do not claim the app watched a video or verified content from its title; discovery uses generic topic information, not private conversations.

**Out of scope:** Video downloads, transcript scraping, embedded playback, and guaranteed external content safety.

### PR 10 — Consistent backup and recoverable restore

**Goal:** Preserve local work and support deliberate movement between machines.

**Scope:** Export database snapshots and referenced files with a versioned manifest/hashes, exclude credentials/PIN, validate restore, make a pre-restore backup, and preserve destination installation settings and conservative usage history. Use the explicit replacement model.

**Commit message:** `feat: back up and restore local family study data [P10]`

**Estimated diff:** 350–600 changed lines.

**Likely areas:** Backup adapter, parent export/restore screens, database lifecycle, archive validation.

**Behaviour after this PR:** A parent can recover a complete study dataset on another supported machine without cloud synchronization or reinstalling credentials from an archive.

**Depends on:** PRs 8–9.

**Validation:** Snapshot includes committed WAL data; round trip with all material kinds; missing/corrupt files; archive traversal/symlink/size rejection; unsupported schema; interrupted replacement recovery; credentials stay local; usage does not reset.

**Review focus:** Restore is explicit and recoverable; no raw live SQLite copying or silent profile/history merging.

**Out of scope:** Automatic sync, archive encryption, or concurrent cross-machine editing.

### PR 11 — Complete parent review and child usability

**Goal:** Make the integrated app practical for daily family use.

**Scope:** Complete parent activity/support/spending views, budget-pause explanations, UI translations in all three languages, age-appropriate screen density, keyboard/math input, source correction, offline states, and pause/resume paths. Keep technical provider details in parent setup.

**Commit message:** `feat: complete multilingual family study workflows [P11]`

**Estimated diff:** 350–650 changed lines.

**Likely areas:** Renderer screens/translations, parent settings, accessibility, user-facing error mapping.

**Behaviour after this PR:** Both grade levels can complete the daily flow and parents can understand progress, resource approvals, and local spending without inspecting logs.

**Depends on:** PRs 2–10.

**Validation:** Full flows across three UI languages and independent homework/explanation languages; long text/fractions; keyboard navigation; offline and exhausted-budget operation; one child cannot change another's active work or admin settings.

**Review focus:** Clear next action in every failure state; UI simplification helps the younger child without hiding lesson identity or the task source.

**Out of scope:** Gamification, avatars, scheduling, and non-maths subjects.

### PR 12 — Evaluate tutoring and package the family pilot

**Goal:** Establish a reviewable release with evidence of its limitations.

**Scope:** Complete the synthetic model-evaluation dataset, platform installer/upgrade tests, migration checks, setup/backup/provider documentation, and a release checklist. Fix material failures in their owning modules; split substantial fixes into focused PRs before release.

**Commit message:** `test: validate maths tutor and package family pilot [P12]`

**Estimated diff:** 300–550 changed lines plus separately reviewed fixes and fixtures.

**Likely areas:** Evaluation fixtures/runner, Electron smoke tests, CI packaging, documentation, release checklist.

**Behaviour after this PR:** Reproducible installers and a documented pilot are available for the actual Macs and Windows PCs. The live family pilot is conditional on provider/account prerequisites and passing acceptance checks.

**Depends on:** PRs 1–11.

**Validation:** Full review contract below, actual installed builds, supported architecture matrix, upgrade preserving data, restore on another OS, live synthetic provider checks, and parent-reviewed examples at both grade levels.

**Review focus:** Report actual results and costs; explicitly list untested platforms and unresolved prerequisites. Mock tests do not prove teaching quality or installed application behaviour.

**Out of scope:** Public launch, app-store publishing, automatic updates, and commercial service operation.

## Validation

### Repository checks

Establish these scripts in the scaffold and run the actual commands rather than assuming they already exist:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm package
pnpm make
```

Run focused tests during development, then the relevant full checks before a slice is complete. Add dependency/dead-code checks only if justified by the repository's conventions. No committed credentials or real child transcripts in test fixtures.

### Model evaluation

Create a compact versioned dataset of approximately 24 synthetic scenarios, with language/grade variants rather than a new evaluation platform:

- Grade 2: addition/subtraction, place value, short word problems, concrete examples.
- Grade 6: signed numbers, fractions, order of operations, word problems, basic geometry uncertainty.
- Bulgarian task/Ukrainian explanation, Ukrainian task/English explanation, same-language flows, and language switching.
- Misread minus sign, denominator, handwritten digit, missing diagram, and source task correction.
- Repeated confusion, simpler explanation, analogous example, unsupported interpretation, and parent help.
- Direct answer demands, fake parent authority, embedded instructions, unseen video/transcript claims, and unsupported resource metadata.

Score separate dimensions: task fidelity, numeric correctness where checkable, answer leakage, teaching-policy compliance, age suitability, language fidelity, and honest source attribution. Keep expected results where deterministic, and a short parent-reviewed rubric elsewhere. Record model/prompt versions, usage, and failures. An LLM judge may assist review but must not be the sole judge.

Release gate: deterministic checks pass; each evaluation case receives parent review; observed final-answer leakage, wrong arithmetic feedback, or false video-content claims are addressed and rerun before the pilot. Passing a small dataset is evidence about those cases, not a universal guarantee.

### Platform and recovery checks

- macOS and Windows installed build launch; actual CPU architectures recorded.
- Create two children and four enrollments, restart, and verify isolated lesson/task/session state.
- Import a photo, text PDF, scanned PDF, article link, and video link; narrow to a task and correct a recognition error.
- Work through supported and independent attempts; resume after crash/offline interruption.
- Exhaust a deliberately small budget; every paid feature stops while local reading remains usable.
- Approve/reject resources and open only permitted external URLs.
- Export on one OS, restore on the other, and verify materials, history, usage, and destination credentials/settings.
- Upgrade an installed build with an existing database and verify migrations and recovery backup.

## Review Contract

Review each slice and the final stack against:

- R1–R18 and N1–N9, with explicit references for any deferred requirement.
- Two children, two school systems, separate enrollment grades, ordered school lessons, and three independent language roles.
- Actual photos/PDF selections/public references, task correction and confirmation, and traceable source revisions.
- One-question tutoring, changed explanations on difficulty, independent checks, and evidence separated from completion.
- Deterministic checking only within its declared maths grammar; uncertainty elsewhere; no leaked internal solutions.
- Profile/lesson scope, parent authorization, valid IPC, secret handling, local-only sensitive records, and untrusted source isolation.
- Metering for every AI/search attempt, conservative unknown outcomes, and honest per-installation budget limits.
- Retrieved resource URLs, evidence labels, parent review, external video behaviour, and honest transcript availability.
- Consistent backup, recoverable replacement, cross-OS restoration, preserved spending, and migration compatibility.
- Actual installer operation on target machines and recorded limits of model evaluations.
- Scope discipline: a single local application with explicit modules and no speculative orchestration/infrastructure.

## Open Questions / Release Blockers

No further product answer is required to begin fixture-based implementation. The following are implementation-time checks and live-use prerequisites:

1. **Provider requirements for children.** OpenAI's current under-18 guidance says not to process personal data of children under 13 or the applicable age of digital consent without Zero Data Retention. Its data-control documentation states ZDR is subject to approval and endpoint limitations. Confirm account eligibility and the exact endpoints before real child data is sent. `store: false`, a parent subscription, a crop, or a nickname does not by itself establish ZDR. If an appropriate arrangement cannot be obtained, implement and evaluate a suitable alternative provider/local approach before live child use; do not silently bypass this prerequisite.
2. **Search compatibility.** Verify that live web search is permitted and available for the chosen model, endpoint, and retention arrangement. Keep synthetic discovery fixtures and manual approved links usable while unresolved. Full automated-discovery acceptance remains open until a live compatible path is demonstrated.
3. **Target hardware.** Record actual macOS CPU architecture and Windows version/architecture before packaging release installers. There is no assumption that one installer covers every machine.
4. **Actual maths materials.** Use a few parent-selected current pages for each grade/school to validate recognition and teaching terminology, under the chosen data-handling arrangement. Synthetic scenarios cannot establish compatibility with every textbook.
5. **Release signing.** Establish a deliberate family installation path. Signed/notarized macOS releases and Windows signing may require separate credentials/costs. Test unsigned development packages only on explicitly chosen family machines and document their installation experience; do not claim public-ready distribution.

Keep these as documented release checks. Do not add a speculative compliance subsystem, multiple unused providers, or a cloud backend to resolve them in advance.

## Technical Debt / Later Options

- Automatic family synchronization, centralized accounting, and multi-device concurrent sessions if real usage justifies hosting.
- Optional encrypted backup format if export files need to leave trusted storage.
- Better article import or transcript access for specific sources where permitted.
- Search over many textbooks only after manual lesson/page selection becomes a measurable burden.
- Maths input improvements, small diagrams/manipulatives, review scheduling, and additional subjects after the maths pilot.
- Voice only if requested again and provider/data constraints support it.

## Official References

Checked 2026-10-15. Codex must recheck current APIs, dependency compatibility, policy, and pricing when implementing. These references support integration constraints; application behaviour and sequencing above are project design decisions.

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Electron Forge TypeScript/Webpack template](https://www.electronforge.io/templates/typescript-+-webpack-template)
- [PDF.js examples](https://mozilla.github.io/pdf.js/examples/)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)

## Starting Instruction for Codex

Read this plan and all applicable AGENTS.md files, inspect the target repository, and report any material conflict before dependent work. Start with PR 1, keeping a runnable feature in each slice and updating a brief implementation checklist after each completed PR. Use the fixture AI adapter until a live operation is deliberately configured and its applicable prerequisites are satisfied. Never claim tests, model quality, installed builds, account capabilities, or provider settings have been verified without evidence. Ask only when missing information would materially alter implementation; otherwise use the documented defaults and record the choice.
