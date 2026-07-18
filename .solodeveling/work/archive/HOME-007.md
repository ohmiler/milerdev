---
solodeveling_schema: 1
---

# HOME-007 - Adopt Prompt as the product typeface

## Goal

Replace IBM Plex Sans Thai with Prompt across MilerDev UI and display typography while preserving dedicated monospace treatment for real code and technical metadata.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Restore the previous Next.js font import and the three global typography tokens; no content or data changes are involved.

## Design thesis

For Thai learners navigating a professional coding platform, use Prompt as a friendly, contemporary Thai voice across the shared interface while retaining monospace only where the product presents real code or technical context.

## Scope

- Load Prompt through `next/font/google` with the weights used across public and administrative UI.
- Route shared display, body, and UI typography tokens to Prompt.
- Preserve Inter as a Latin fallback and the existing code-font stack.
- Inspect representative desktop and mobile homepage renders for typography, wrapping, and overflow.

## Out of scope

- Type-scale, copy, spacing, component composition, email markup, or code-editor typography changes.

## Acceptance

- Shared display, body, and UI typography resolves to Prompt.
- Code/editor typography remains on the existing monospace stack.
- Homepage desktop and mobile layouts retain readable Thai wrapping without horizontal overflow.
- Lint, build, rendered browser inspection, and diff checks are recorded.

## Plan

1. Replace the root Thai font loader and global typography token references.
2. Run static checks and a production build.
3. Inspect computed fonts and representative desktop/mobile renders, then record evidence.

## Completion

All acceptance criteria have current static, production-build, computed-style, and rendered desktop/mobile evidence in `evidence/HOME-007.md`.
