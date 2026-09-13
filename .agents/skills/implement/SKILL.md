---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use `tdd` for behavior changes where a meaningful regression or acceptance test is warranted. Infer testing seams from the spec and existing interfaces; reuse decisions already agreed.

Follow `AGENTS.md` for verification scope and commands. Fix failures caused by the requested change and rerun affected checks. Report unrelated failures separately.

Review the completed change against the request and repository standards. Use `code-review` for changes that benefit from a separate review, passing the known scope and spec; a trivial documentation edit can be reviewed directly.

Complete delivery within the Git permissions in `AGENTS.md` and the user's request. For authorized issue-based feature-branch work, continue through commit, push, PR, CI, and fixes caused by the change. Otherwise hand off the verified local change unless further delivery is authorized. Do not treat the current branch or this skill as permission to commit unrelated work or deploy.
