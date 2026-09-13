---
type: contract
status: needs-review
phase: 4
contract_status: draft
updated: 2026-09-13
review_reason: ADR-0001 affects this phase: Deviation in task 02.1: contract-change (01:state-path gains an optional `pending` section, so phase…).
depends_on: [../../roadmap.md]
summary: Draft — what phase 04 (Run reporting) exposes to later phases and consumes from earlier ones.
---

# Phase 04 · Contracts

**Draft.** Shape-level only; `pw-plan` firms it when the phase enters the window.

## exposes

_Nothing. Reporting is the last step; nothing is built on top of it._

## consumes

### from PH-01 · 01:state-store
- **why:** a report must say whether state was readable
- **relies on:** the unreadable-state signal only

### from PH-02 · 02:publish
- **why:** a report must say what was actually published
- **relies on:** the published-item count and the committed marks

### from PH-03 · 03:fetch-retry
- **why:** a report must name every skipped or retried source
- **relies on:** the classification and the attempt count
