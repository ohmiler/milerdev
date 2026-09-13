# Maintaining project skills

The project tracks customized copies of six skills from
[Matt Pocock's skills](https://github.com/mattpocock/skills): `code-review`,
`diagnosing-bugs`, `grill-with-docs`, `implement`, `tdd`, and `to-spec`.
Their supporting files and invocation metadata are included with each skill.
Other locally installed skills are outside this snapshot.

The upstream MIT notice is preserved in
[mattpocock-skills.LICENSE](../../.agents/licenses/mattpocock-skills.LICENSE).
[skills-provenance.json](../../.agents/skills-provenance.json) records the imported
installer metadata and the license blob checked during this snapshot. The
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
For `implement`, `to-spec`, and `grill-with-docs`, it rejected the existing
`disable-model-invocation` frontmatter field on both the original and edited
copies. The existing explicit invocation policy was retained.

Runtime agent behavior still needs observation on real tasks: a small text edit,
a bug fix with a regression test, and a review before committing. Check whether
questions are limited to consequential ambiguity, verification matches impact,
and completion stays within authorization. Command checks alone do not establish
that the agent is faster or asks fewer questions.
