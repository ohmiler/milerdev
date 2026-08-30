# Domain Docs

Before exploring the codebase, engineering skills should read:

- `CONTEXT.md` at the repository root, when present.
- `CONTEXT-MAP.md`, when present, and the contexts relevant to the task.
- ADRs under `docs/adr/` that affect the area being changed.

Missing domain files should not block work. `/domain-modeling`,
`/grill-with-docs`, and `/improve-codebase-architecture` create or update them
when terminology or decisions are actually resolved.

## Layout

This is a single-context repository:

```text
/
|-- CONTEXT.md
|-- docs/adr/
`-- src/
```

Use terminology defined in `CONTEXT.md` consistently in issue titles,
implementation plans, tests, and code.

If proposed work conflicts with an existing ADR, surface the conflict explicitly
instead of silently overriding the decision.
