---
type: contract
status: closed
phase: 2
contract_status: firm
updated: 2026-09-13
depends_on: [../../roadmap.md]
summary: what phase 02 (Publish atomicity) exposes to later phases and consumes from earlier ones.
---

# Phase 02 · Contracts

**Firm.** Firmed 2026-09-13 with the phase 02 plan; later phases may rely on it.

## exposes

### 02:publish
- **kind:** interface
- **shape:** `publish({ feedPath, feed, marks, statePath, state }) -> { published, promoted }` where
  `marks` is `[{ kind: "tweet"|"video", id }]`. Records the marks as pending and saves, writes the
  feed with `writeAtomic`, then promotes the marks and saves again.
  `reconcile(state, { feedDir, statePath }) -> { promoted, dropped, checked }` resolves a pending
  entry by reading the feed it names. `feedIds(feed)` returns the ids a feed document carries.
- **stability:** firm


## consumes

### from PH-01 · 01:state-store
- **why:** publishing is what decides when a mark is committed
- **relies on:** the atomic save and the unreadable-state signal, not the file format
