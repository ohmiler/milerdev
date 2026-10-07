# ADR 0013: Deploy from a production branch when the owner says "deploy"

- Status: Accepted (the owner chose it on 2026-10-07)
- Date: 2026-10-07
- Decision owners: MilerDev owner and engineering
- Scope: How finished work reaches Railway production, and who merges into `master`
- Supersedes: "A merge to `master` deploys to Railway production" and the merge tiers in AGENTS.md before this date

## Context

Railway deployed every commit on `master`, so every merged PR was a production deploy. A small copy fix cost as much as a feature: a PR, the owner's "merge", a deploy, and about ten minutes for `Production Smoke` before the next PR could merge. On 2026-10-07 two finished PRs had to merge one after the other for that reason, and the owner found deploying after every change, large or small, tiresome.

MilerDev has one owner and an AI agent. Nobody else reviews, so each step that needs the owner's message should protect production, not just record that work happened.

## Decision

1. Railway production deploys the `production` branch, not `master`.
2. `master` collects finished work. Merging into it does not deploy, so it stays deployable: only finished work is merged.
3. The agent opens a PR as soon as work is done and checked. It merges docs, tests and ordinary code (tiers A and B) itself once every check passes and the branch is up to date. High-risk code and CI changes (tier C) still need the owner to read the diff and merge or say "merge".
4. The owner says "deploy" when a batch should ship. The agent checks that CI passed on the latest `master` commit, that the previous deploy's `Production Smoke` succeeded, and that no migration removes something the running code still uses. It lists what ships, then fast-forwards `production` to that `master` commit. It never force-pushes.
5. Because one deploy can carry many PRs, the code that stops using a column and the migration that removes it ship in separate deploys.
6. A bad deploy is undone by the owner rolling the deployment back in Railway (code only; migrations stay applied), or by reverting in `master` and deploying again.

## Consequences

- The owner's messages drop to "deploy", plus "merge" for high-risk PRs. Merges no longer wait for a deploy and its smoke run.
- Each deploy carries more change, so a failure can take longer to trace to one PR. Every PR still passed CI on its own, `master` CI runs on the combined code, and the deploy report lists every PR it carried.
- There is no separate hotfix path. An urgent fix merges into `master` and deploys everything finished with it, which works because `master` stays deployable.
- `Production Smoke` keys on the Railway environment, not the branch, so it keeps running after each deploy unchanged.
- Until the owner switches Railway to the `production` branch, merges into `master` still deploy, and the agent treats them that way.
