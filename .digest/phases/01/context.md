---
type: context
status: closed
phase: 1
updated: 2026-09-13
depends_on: [../../spine.md, ../../roadmap.md]
summary: Locked preferences for state integrity: atomic rename, the already-declared lock library, status over silence.
---

# Phase 01 · State integrity — Context

The only place this phase's technology choices are made (INV-1).

## Decisions

### D-01 · Atomic writes are write-to-temp then rename, with the directory flushed
- **why:** rename within a filesystem is atomic, so a reader either sees the old file or the new one and never a half-written one. The state file is committed to the repository, so a torn write is a corrupted repository, not just a bad run
- **alternatives:** write in place — rejected, it is the current defect; a journal — rejected as heavier than the problem
- **reversible:** cheap

### D-02 · Locking uses `proper-lockfile`, already a declared dependency
- **why:** it is already in package.json and unused, it handles stale locks and retries, and reuse beats a hand-rolled O_EXCL lock (INV-7)
- **alternatives:** a hand-rolled mkdir or O_EXCL lock — rejected, we would reimplement staleness detection badly
- **reversible:** cheap behind the store interface

### D-03 · An unreadable state file is a reported status, never an empty state
- **why:** the current code catches the parse error and returns `{}`, which silently turns every previously-seen item into new content — 213 duplicate items in one digest. A status the caller must handle makes that failure loud
- **alternatives:** throw — rejected, the caller may legitimately want to continue after a human decision; silently reset — that is the bug
- **reversible:** one-way: callers now branch on status

### D-04 · The on-disk format does not change
- **why:** the file is committed and has real history; changing its shape would discard the existing dedup memory and re-send everything once
- **alternatives:** add a version wrapper — deferred, it buys nothing until the shape actually changes
- **reversible:** cheap, and a future change can add a version key

## Parked questions

| # | Question | Default for now | What closes it |
|---|---|---|---|
| P-01 | Should the store keep a backup of the previous state? | no — git history is the backup, since the file is committed | a corruption that git cannot recover |
| P-02 | Should retention be configurable? | a parameter with the current 7-day default, not config — nobody has asked | a second retention requirement |

## Prior art read

- The existing `loadState` / `saveState` in `scripts/generate-feed.js` — the retention window and the file location are kept exactly; the silent catch and the in-place write are what change
- `proper-lockfile`, already declared in `scripts/package.json` and never imported

## Does not decide

- when a mark is committed relative to publishing — phase 2 owns that
