---
type: template
status: approved
updated: 2026-09-13
depends_on: [../conventions.md]
summary: Template for phases/NN/contracts.md — the exposes/consumes surface of one phase.
---

# Template · `phases/NN/contracts.md`

Copy the block below. Every phase has this file, even when both sections are empty (INV-3).

```markdown
---
type: contract
status: draft            # draft | approved | firm | closed | needs-review
phase: NN
contract_status: draft   # draft at design time, firm when pw-plan approves the phase
updated: YYYY-MM-DD
depends_on: [../../roadmap.md]
summary: What phase NN exposes to later phases and consumes from earlier ones.
---

# Phase NN · Contracts

## exposes

Items later phases may rely on. One `###` per item, id `NN:<kebab-name>`.

### NN:<kebab-name>
- **kind:** file | directory | cli | skill | schema | format | config-key | event | interface
- **shape:** the minimum another phase needs in order to depend on this — a path, a signature,
  a required key set, an exit-code contract. Concrete enough to be wrong.
- **stability:** firm | draft
- **notes:** what is deliberately *not* promised.

## consumes

One `###` per item, naming the upstream phase and the exact item id.

### from PH-MM · MM:<kebab-name>
- **why:** the one thing this phase cannot do without it.
- **relies on:** the part of the upstream shape actually used. Narrower is better — lint
  resolves this against the upstream `exposes`, and a narrow reliance survives upstream change.

## open

Questions this contract cannot answer yet, with the phase that answers each. Delete if none.
```

## Rules

1. **Empty is explicit.** A phase with no external surface writes
   `## exposes` followed by `_Nothing. <one line saying why>_` — never a missing section and
   never a missing file.
2. **`consumes` names an id, not a page.** `03:bundle-surface`, not "the bundle stuff from
   phase 3". Lint resolves by id (REQ-6 check 2).
3. **Draft contracts are shape-level.** At design time a draft may say "a CLI subcommand that
   takes a phase number and prints a page list" without naming flags. `pw-plan` firms it.
4. **Firming is narrowing, not widening.** A firm contract may add detail to a draft; if it
   contradicts one a downstream phase consumes, that page is marked `needs-review` with a
   `review_reason` (REQ-4, REQ-7).
5. **Nothing is promised twice.** One item, one owning phase. Two phases exposing the same id
   is a lint error.
