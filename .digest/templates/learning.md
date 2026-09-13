---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for learnings/<slug>.md — a cross-cutting reusable pattern.
---

# Template · `learnings/<slug>.md`

```markdown
---
type: learning
status: active
updated: YYYY-MM-DD
depends_on: []
tags: [<area>, <technique>]
summary: One line stating the pattern as a rule, not as a story.
---

# <Pattern name>

## Rule

The thing to do, in one or two sentences, stated so it can be followed without the rest of
this page.

## Why

The failure this prevents. With the concrete instance that produced it — phase, task, ADR.

## How to apply

Steps, or a snippet. Short enough to paste.

## Does not apply when

The boundary. A learning with no stated boundary gets over-applied.
```

## Rules

1. **Cross-cutting only.** If it is only true of one phase, it belongs in that phase's
   `summary.md` §Gotchas, not here (REQ-8).
2. **Stated as a rule.** A page whose `summary` is a narrative ("we had trouble with X") is a
   gotcha, not a learning.
3. **Tagged**, so a later indexer and the catalog can both find it.
