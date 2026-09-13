---
type: index
status: active
updated: 2026-09-13
depends_on: []
summary: How to read this wiki, and which bundle each session type loads.
---

# Follow Builders digest — planning wiki

This directory is the project-local wiki (REQ-2). All project state lives here;
nothing is written outside the repository root (INV-5).

## Read order

| Session | Bundle |
|---|---|
| plan | spine, catalog, roadmap, state, all prior contracts, this phase's context |
| build | spine invariants, this task's block, this phase's contracts, consumed contracts, state |
| close | plan, contracts, the REQ text for this phase, state |

Run `pw-wiki bundle <session-type> [phase] [task]` rather than guessing.
