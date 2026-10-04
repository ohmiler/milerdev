# Maintaining project skills

The project tracks seventeen skills under `.agents/skills/`. Their supporting
files and invocation metadata are included with each skill.

| Source | Skills |
| --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `grill-with-docs`, `grilling`, `handoff`, `implement`, `prototype`, `research`, `tdd`, `to-spec`, `wayfinder` |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | `shadcn` |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `vercel-react-best-practices`, `web-design-guidelines` |
| [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) | `seo` |

Install only skills that serve this project, and track each one here. On
2026-10-04 these installed skills were removed because they overlapped tracked
skills or conflicted with `AGENTS.md`: `pr` (a different PR body template),
`implement-spec` and `to-tickets` (one large integration branch built by
parallel subagents), `triage` (external-contributor triage that closes issues),
`improve-codebase-architecture` (overlaps `codebase-design`),
`git-guardrails-claude-code` (one-time hook setup), and
`vercel-composition-patterns` (no description, overlaps
`vercel-react-best-practices`). The installer lock `skills-lock.json` is
ignored because it also lists skills installed elsewhere.

Six skills have local workflow adaptations described below. `codebase-design`
and `domain-modeling` were added from the existing local installation without
editing their instructions. They supply the interface vocabulary and domain
documentation formats referenced by the customized skills. The root project's
existing `CONTEXT.md` is separate project content and is not part of this import.

The upstream MIT notices are preserved in
[mattpocock-skills.LICENSE](../../.agents/licenses/mattpocock-skills.LICENSE),
[shadcn-ui.LICENSE](../../.agents/licenses/shadcn-ui.LICENSE), and
[web-quality-skills.LICENSE](../../.agents/licenses/web-quality-skills.LICENSE).
`vercel-labs/agent-skills` has no license file; its README states MIT.
[skills-provenance.json](../../.agents/skills-provenance.json) records the imported
installer metadata, the license blob checked for the first snapshot, and the
upstream head checked for the other sources. The
installer hashes describe the original installation; they are not checksums of
our customized files and do not establish an upstream commit.

## Local adaptations

- `AGENTS.md` owns project authorization, verification, and delivery boundaries.
- `tdd` and `to-spec` reuse agreed requirements and existing testing interfaces.
- `implement` follows project verification and authorized delivery rules.
- `diagnosing-bugs` permits qualified static analysis when reproduction is blocked.
- `code-review` covers the requested committed or uncommitted scope, including
  relevant new files, and continues standards review without a missing spec.
- `grill-with-docs` can work without an installed `grilling` skill.

## Updating from upstream

Download a proposed upstream version into a separate temporary directory. Compare
its instructions, references, scripts, invocation metadata, and license against
the tracked copy before applying selected changes. Avoid reinstalling directly
over these directories: an installer may replace local adaptations.

Keep the upstream notice and record the actual revision used for future updates
in the provenance file. Preserve installer hashes as historical metadata rather
than replacing them with an unrelated locally calculated hash. Review the staged
diff and commit only the intended skill changes and their dependencies.

## Verification

For this snapshot, UTF-8, local Markdown links, whitespace, and preservation of
the existing safety and invocation rules were checked. Review diff commands
passed six cases in an isolated repository: committed, staged, unstaged, combined
uncommitted, branch plus unfinished work, and untracked files.

The bundled skill validator accepted `tdd`, `diagnosing-bugs`, and `code-review`.
It also accepted the added `codebase-design` and `domain-modeling` skills; their
local reference links, supporting files, and YAML metadata were checked.
For `implement`, `to-spec`, and `grill-with-docs`, it rejected the existing
`disable-model-invocation` frontmatter field on both the original and edited
copies. The existing explicit invocation policy was retained.

Runtime agent behavior still needs observation on real tasks: a small text edit,
a bug fix with a regression test, and a review before committing. Check whether
questions are limited to consequential ambiguity, verification matches impact,
and completion stays within authorization. Command checks alone do not establish
that the agent is faster or asks fewer questions.
