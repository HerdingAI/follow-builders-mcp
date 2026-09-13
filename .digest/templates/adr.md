---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for decisions/ADR-nnnn-<slug>.md, in the Nygard shape plus downstream routing.
---

# Template · `decisions/ADR-nnnn-<slug>.md`

```markdown
---
type: adr
id: ADR-nnnn
status: draft              # draft | approved | superseded
updated: YYYY-MM-DD
depends_on: []
affects_phases: []         # phase numbers whose plan or contract this changes. [] is a claim, not a default
supersedes: null           # ADR-nnnn or null
summary: One line naming the decision, not the problem.
---

# ADR-nnnn · <decision stated as a choice made>

## Context

What was true when this came up. For a deviation ADR: what the plan or contract said, and what
execution found. Facts and constraints only — no argument yet.

## Decision

The choice, in the present tense and the active voice: "`pw-wiki` exposes `lint` as a
subcommand", not "we will probably expose lint".

## Consequences

What follows, good and bad. At minimum: what is now harder, and what must change elsewhere.

## Affects

| Phase | Page | Action |
|---|---|---|
| NN | `phases/NN/contracts.md` | update draft / mark `needs-review` |

Must agree with the `affects_phases` frontmatter. `pw-close` reads this table (REQ-7).

## Revisit trigger

The observation that would reopen this. Omit only for a decision nothing could reverse.
```

## Rules

1. **Created before the work continues**, not after it is finished (INV-4).
2. **`affects_phases` is load-bearing.** `pw-close` routes on it: every named phase not yet
   planned gets its draft contract updated or marked `needs-review`.
3. **Superseding is two edits**: the new ADR sets `supersedes`, and the old one flips to
   `status: superseded`. Never delete an ADR.
4. **One decision per ADR.** Two decisions that merely arrived together are two ADRs.
