---
type: summary
status: closed
phase: 1
updated: 2026-09-13
depends_on: [plan.md, contracts.md]
summary: The seen state is now crash-safe: atomic rename under a lock, with corruption reported rather than swallowed.
---

# Phase 01 · State integrity — Summary

## Built

- `scripts/lib/state-store.js` — `loadState` returning a status, `saveState` pruning then writing a sibling temp file, flushing it and renaming, both under a `proper-lockfile` lock
- `scripts/test/state-store.test.js` — torn write, unreadable file, concurrent writers, prune window, offline with no credentials
- `scripts/generate-feed.js` — routed through the store, exiting non-zero rather than publishing on an unreadable state
- a `test` script in `scripts/package.json`, where there was none

## Not built (and why)

- **A versioned state format.** The file is committed and has real history; changing its shape would discard the dedup memory and re-send everything once. A version key can be added when the shape actually needs to change.
- **A backup copy of the previous state.** The file is in git, which is a better backup than a sibling copy.
- **Configurable retention.** A parameter with the existing 7-day default, because nobody has asked for more.

## Deviations

| ADR | What changed | Affects phases |
|---|---|---|
| — | ran to plan | — |

## Gotchas

- The original `loadState` caught a parse error and returned `{}`. With 213 tracked tweet ids, that one silent catch turns a corrupted file into a digest that re-sends everything ever featured. A catch that returns a plausible empty value is worse than a crash, because the failure arrives as content.
- `proper-lockfile` was already a declared dependency and never imported — the intent to lock was recorded in `package.json` a while ago and never reached the code. Checking declared-but-unused dependencies is a cheap way to find abandoned intent.
- Pruning has to happen before the write, not after: pruning the in-memory object and then writing is one atomic step, while writing and then pruning leaves a window where the file holds entries the process has already forgotten.

## What the next planner must know

- Phase 2 relies on `saveState` being atomic and on the `unreadable` status, not on the file format. The format is deliberately outside the contract.
- The generator now exits non-zero on unreadable state. A scheduled run will therefore fail loudly rather than publish — which is the intent, and it means the job needs a human when it happens.
- The retention window and file location are unchanged so the committed history stays valid. Changing either re-sends everything once.

## Learnings promoted

| Candidate | Promoted to | Or rejected because |
|---|---|---|
| A catch that returns a plausible empty value hides the failure in the output | `learnings/empty-is-not-a-safe-default.md` | — |
| Declared-but-unused dependencies mark abandoned intent | `learnings/unused-dependencies-mark-abandoned-intent.md` | — |
| Prefer async/await to callbacks | — | already uniform in this codebase, and a style point rather than a pattern |

## Acceptance

| REQ | Criterion | Status | Evidence |
|---|---|---|---|
| REQ-1 | A write interrupted partway leaves the previous state intact and readable. | pass | state-store.test.js: torn write |
| REQ-1 | A corrupted state file is reported as an error, and the run refuses rather than proceeding with empty state. | pass | state-store.test.js: unreadable status; generate-feed exits non-zero |
| REQ-1 | Two concurrent writers cannot interleave a write. | pass | state-store.test.js: concurrent saves |
| REQ-1 | Pruning removes only entries older than the retention window, and never the whole file. | pass | state-store.test.js: prune window |
| REQ-4 | The test suite runs offline, with no credential set, and passes. | pass | npm test with no env |
