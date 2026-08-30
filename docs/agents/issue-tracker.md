# Issue tracker: GitHub

Issues and specs for this repo live in GitHub Issues at `ohmiler/milerdev`.
Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`
- Infer the repository from `git remote -v`.

## Pull requests as a triage surface

PRs as a request surface: no.

GitHub shares one number space across issues and pull requests. Resolve ambiguous
references with `gh pr view <number>` and fall back to `gh issue view <number>`.

## Skill operations

- "Publish to the issue tracker" means create a GitHub issue.
- "Fetch the relevant ticket" means run `gh issue view <number> --comments`.
- Specs and tracer-bullet tickets use GitHub Issues.
- Blocking relationships should use GitHub native issue dependencies when
  available, with a `Blocked by: #<number>` fallback.
- Claiming a ticket means assigning it to the current GitHub user.
- Resolving a ticket means recording the outcome and closing the issue.
