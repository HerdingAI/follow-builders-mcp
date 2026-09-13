---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for phases/NN/context.md — the phase's locked technical preferences.
---

# Template · `phases/NN/context.md`

This is the **only** place technology choices are allowed to be made (INV-1). `pw-plan`
produces it from the discuss step, before writing `plan.md`. Forked from GSD's `CONTEXT.md`
`<decisions>` block, with `D-nn` numbering kept.

```markdown
---
type: context
status: draft
phase: NN
updated: YYYY-MM-DD
depends_on: [../../spine.md, ../../roadmap.md]
summary: Locked implementation preferences and parked questions for phase NN.
---

# Phase NN · <name> — Context

## Decisions

### D-01 · <the choice, stated>
- **why:** the reason, in terms a future reader will still be able to check
- **alternatives:** what was considered and what ruled each out
- **reversible:** cheap | costly | one-way — and what makes it so

### D-02 · …

## Parked questions

| # | Question | Default for now | What closes it |
|---|---|---|---|

## Prior art read

What was actually read before planning, and what was taken (INV-7). A `build` decision with
nothing in this section is an INV-7 violation.

## Does not decide

Choices a reader might expect here that belong to a later phase, naming that phase.
```

## Rules

1. **Discuss before plan.** `context.md` is written and agreed first; `plan.md` cites it.
2. **A decision the user has not seen is not locked.** Present, then stop until you hear yes —
   the pattern copied from the Superpowers brainstorming skill.
3. **Layer-1 pages stay clean.** When a technology choice surfaces while writing Layer 1, it is
   parked here as a `D-nn` (REQ-3).
