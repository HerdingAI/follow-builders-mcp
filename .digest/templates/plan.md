---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for phases/NN/plan.md and its self-contained task blocks.
---

# Template · `phases/NN/plan.md`

```markdown
---
type: plan
status: draft              # draft until lint is clean and the user approves
phase: NN
reqs: [REQ-n, REQ-m]
approved: false
updated: YYYY-MM-DD
depends_on: [contracts.md, context.md, ../../requirements.md]
summary: One line naming what this phase builds.
---

# Phase NN · <name> — Plan

## Goal

Two or three sentences. The state of the world when this phase closes.

## Out of scope

What a reader might reasonably expect here and will not find, with the phase that has it.

## Tasks

### Task NN.1 · <imperative title>
- **reqs:** REQ-n
- **contracts:** NN:<item> (exposes) · MM:<item> (consumes)
- **depends_on_tasks:** [] | [NN.t]
- **files:** every path created or modified
- **goal:** one sentence — why this task exists
- **action:** numbered steps, concrete enough to execute without the rest of this plan
- **verify:** the exact command to run, and what passing looks like
- **done:** the checkable end state
- **deviation check:** the specific things that, if they turn out otherwise, require an ADR
  rather than a judgement call

### Task NN.2 · …

## Manual acceptance

The REQ acceptance criteria this phase is responsible for, each mapped to the task that
satisfies it. `pw-close` verifies against this list.
```

## Rules

1. **One task, one session, one bundle** (REQ-11). If a task needs two sessions, it is two
   tasks.
2. **Self-contained blocks.** A task block is readable and executable without reading any
   sibling block. Repeat context rather than cross-referencing a sibling.
3. **Every task carries ≥ 1 REQ-id** (REQ-6 check 1). A task that traces to no requirement is
   either scope creep or a missing requirement — both need a decision, not a silent task.
4. **`depends_on_tasks` is explicit, including when empty** (REQ-15). `[]` means "can run
   first", and is a claim.
5. **`verify` is a command, not an intention.** "Tests pass" is not a verify; the command that
   runs them is.
6. **Field set forked from GSD's `<task>` block** (`name`/`files`/`action`/`verify`/`done`),
   with `reqs`, `contracts` and `depends_on_tasks` added — those three are what make lint and
   bundle assembly possible.
