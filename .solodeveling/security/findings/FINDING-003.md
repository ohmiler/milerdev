---
solodeveling_schema: 1
id: FINDING-003
title: OAuth account links lack provider identity uniqueness at the database boundary
severity: medium
confidence: high
source: manual-review
affected_asset: Auth.js accounts table and Google account linking
evidence:
  - The accounts schema has no unique index over provider and providerAccountId.
  - The current Drizzle snapshot reports zero indexes for accounts.
impact: Concurrent or repeated provider linking can create ambiguous duplicate account rows and weaken deterministic account ownership lookup.
recommendation: Run a production-safe duplicate preflight, resolve any conflicts explicitly, then add and verify a composite unique index without changing verified-email linking policy.
status: open
verification: []
---
