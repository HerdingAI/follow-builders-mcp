---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for phases/NN/summary.md, written by pw-close after verification.
---

# Template · `phases/NN/summary.md`

```markdown
---
type: summary
status: closed
phase: NN
updated: YYYY-MM-DD
depends_on: [plan.md, contracts.md]
summary: One line on what phase NN actually delivered.
---

# Phase NN · <name> — Summary

## Built

What exists now, task by task, as it actually is. Where the plan and reality differ, reality
wins here and the difference appears under Deviations.

## Not built (and why)

Planned and dropped, planned and deferred, or discovered and declined. Each with the phase or
requirement that now owns it, or "dropped" and the reason.

## Deviations

| ADR | What changed | Affects phases |
|---|---|---|
| ADR-nnnn | … | NN, MM |

Empty only if the phase ran exactly to plan. An empty table with a non-empty "Built that the
plan did not ask for" is an INV-4 failure found at close.

## Gotchas

Things that cost time and will cost it again. Specific, reproducible, and about this codebase.

## What the next planner must know

The handoff. Read by `pw-plan` for phase N+1 by default (REQ-8). Contract changes, invalidated
assumptions, and anything the next phase's draft contract now gets wrong.

## Learnings promoted

| Candidate | Promoted to | Or rejected because |
|---|---|---|
| … | `learnings/<slug>.md` | — |

Promotion is a decision, not a default (REQ-8).

## Acceptance

| REQ | Criterion | Status | Evidence |
|---|---|---|---|
| REQ-n | … | pass / fail / n-a | command output, file, or test name |
```
