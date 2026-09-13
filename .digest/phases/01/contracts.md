---
type: contract
status: closed
phase: 1
contract_status: firm
updated: 2026-09-13
depends_on: [../../roadmap.md]
summary: what phase 01 (State integrity) exposes to later phases and consumes from earlier ones.
---

# Phase 01 · Contracts

**Firm.** Firmed 2026-09-13 with the phase 01 plan; later phases may rely on it.

## exposes

### 01:state-store
- **kind:** interface
- **shape:** `loadState(path) -> { state, status }` with `status` of `ok` | `missing` | `unreadable`;
  `saveState(path, state, { retentionMs }) -> { pruned, written }` pruning entries older than the
  window, writing a sibling temp file, flushing it, then renaming; both under a `proper-lockfile`
  lock. `RETENTION_MS` is exported. An unreadable file never yields an empty state.
- **stability:** firm
- **notes:** says nothing about the on-disk shape beyond it being the existing JSON

### 01:state-path
- **kind:** file
- **shape:** `state-feed.json` at the repository root, `{ seenTweets: {id: ms}, seenVideos: {id: ms} }`,
  unchanged in location and schema so the committed dedup history stays valid.
- **amended by ADR-0001 (phase 02):** an optional `pending` object may also be present. Existing
  files stay valid — the key is absent from every state written before phase 02 — but any reader
  must tolerate it. This contract is closed; the amendment is recorded here rather than rewritten
  into the shape above, so the original promise and its revision are both visible.
- **stability:** firm


## consumes

_Nothing. Phase 1 depends on no earlier phase's surface._
