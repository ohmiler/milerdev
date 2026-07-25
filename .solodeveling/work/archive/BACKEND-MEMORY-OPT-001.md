# BACKEND-MEMORY-OPT-001

- Status: done for the authorized local implementation boundary
- Type: Standard performance maintenance
- Goal: Reduce the web process warm-memory footprint and add safe diagnostics
  that distinguish JavaScript heap growth from RSS/native growth.
- Authority: Local source changes and verification only. No database, migration,
  commit, push, Railway configuration, or deployment effects were authorized.
- Baseline: Railway Sum view showed one-replica steady memory around 450-750 MB,
  restart lows around 180-250 MB, and deployment-overlap peaks near 1.1 GB. The
  billed web-service average was about 638 MB.

## Delivered scope

- Production Node instrumentation emits aggregate RSS, heap, external,
  ArrayBuffer, and active-resource counts at startup and every five minutes.
- Diagnostics are Node-production-only, contain no request/user/database fields,
  start once per module instance, and use an unreferenced timer.
- Next.js default 50 MB in-memory server cache is disabled.
- Processed rich HTML uses a 2 MiB estimated byte-budget LRU and bypasses entries
  larger than the whole budget.
- Lowlight registers 24 common course languages instead of all 37 common
  grammars, while retaining aliases, auto-detection, and unknown-language fallback.

## Acceptance and recovery

- Diagnostics, cache accounting/eviction, highlighting, sanitization, and config
  contracts have focused tests. The full unit suite, lint, build, and diff check pass.
- Production memory reduction is not claimed until the exact candidate is released
  and observed in Railway Replica view for 24 hours.
- If latency/load regresses, restore the Next memory cache first. If content
  highlighting regresses, add the required grammar or restore the common registry.
  Diagnostics can be removed independently without data recovery.

- Next action: Review and commit the scoped files, then separately authorize a
  production release and 24-hour memory observation if desired.
