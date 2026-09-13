---
type: conventions
status: approved
updated: 2026-09-13
depends_on: []
summary: Wiki layout, frontmatter schema, ID conventions, status lifecycle and catalog line format.
---

# Conventions

The normative shape of this wiki. `pw-wiki validate` enforces it; `schema/frontmatter.schema.json`
in the pw package is the machine-readable copy. Changing anything here needs an ADR.

## 1. Layout

```
<wiki-root>/
  README.md  spine.md  requirements.md  roadmap.md  conventions.md
  state.md (append-only)  _catalog.md (generated)  config.json
  templates/*.md
  decisions/ADR-nnnn-<slug>.md
  phases/NN/{context,plan,contracts,summary}.md
  learnings/<slug>.md
```

Phase directories are zero-padded numbers with no slug, so a phase number alone resolves to a
path — which bundle assembly and contract resolution both need. Nothing is ever written outside
the repository root (INV-5).

## 2. Frontmatter

Required on every page: `type`, `status`, `updated` (YYYY-MM-DD), `depends_on` (list; `[]` is
allowed, the key is not), `summary` (one line, <= 120 chars — the catalog prints it verbatim).

Phase pages also carry `phase`. By type: `adr` adds `id` and `affects_phases`; `plan` adds
`reqs` and `approved`; `contract` adds `contract_status` (`draft` | `firm`); `learning` adds
`tags`; `catalog` adds `generated_by` and `page_count`. Unknown keys warn, never error.

`type`: index, spine, requirements, roadmap, conventions, state, catalog, context, plan,
contract, summary, adr, learning, template.

`status`: draft, approved, active, firm, closed, inferred, needs-review, superseded.

## 3. Ids

`REQ-n` (unpadded, monotonic, never reused) · phases `NN` / `PH-NN` · tasks `NN.t` ·
`ADR-nnnn` · context decisions `D-nn` · contract items `NN:<kebab-name>`.

## 4. Catalog line format

`path · type · phase · status · summary`, one line per page, path order, generated — never
hand-edited.

## 5. Body conventions

One H1 per page. Every retrievable unit under its own `##` or `###` heading, self-contained
enough to be read without the rest of the page. Contract items and REQ-ids must be greppable as
bare tokens, not only present inside a table. Cross-references are wiki-relative paths or bare ids.

## 6. Token estimation

1 token ~= 4 characters, frontmatter included. Always reported as an estimate.
