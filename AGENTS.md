# Instructions for coding and review agents

Before changing code, read [the agent guide](docs/agent-guide.md), the applicable section of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and [the implementation checklist](docs/implementation-checklist.md). Treat the plan as product intent, the guide as repository orientation and working constraints, and the checklist as the evidence-based record of what has actually been implemented and verified.

Work only in the PR slice the user has authorized. The implementation is delivered as sequential PRs; do not begin a later PR until the user approves the current one. Do not commit or push: the user creates branches from `main`, adds commits, and pushes. Inspect the current branch, base diff, uncommitted changes, and untracked files before editing. Preserve user changes.

For reviews, separate confirmed defects from hypotheses and environment limits. Give each confirmed defect its scenario, impact, and smallest useful correction. Do not claim a build, package, interactive UI check, or platform verification unless it was actually run on the relevant current code/artifact. Keep changes focused, preserve existing boundaries, and add targeted regression tests for confirmed defects where appropriate.
