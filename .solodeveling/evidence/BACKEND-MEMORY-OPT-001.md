# BACKEND-MEMORY-OPT-001 Evidence

## Current acceptance matrix

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 Diagnostics are aggregate, single-start, and unreferenced | Pass | Focused memory diagnostics tests: 2 passed | Production logs not exercised |
| AC2 Default Next in-memory cache is disabled | Pass | Config test passed; clean Next 16.1.4 build | Runtime latency/load not measured |
| AC3 HTML cache has bounded LRU byte behavior | Pass | Focused cache tests: 3 passed | JS string size is a conservative estimate, not RSS |
| AC4 Highlighting and sanitization remain functional | Pass | Focused sanitize tests: 3 passed | Production content inventory unavailable |
| AC5 Applicable regressions and integrity pass | Pass | 475 tests, lint, build, and git diff check passed | No deploy or live smoke authorized |

## Observations

- The first focused run passed 7 of 9 tests. Two sanitize fixtures had lost quoted
  HTML attributes through the Windows patch launcher; source behavior was unchanged.
  Fixtures were corrected and the controlled rerun passed 9 of 9.
- The first build exited successfully but warned that a static instrumentation import
  exposed Node APIs to the Edge bundle. A conditional dynamic import removed the
  warnings; the subsequent production build compiled, type-checked, and generated
  all 91 static pages successfully.
- Full Vitest run: 69 files and 475 tests passed. Expected mocked error-path logs
  appeared; no test failed.
- ESLint completed with exit code 0. Git diff check completed with exit code 0;
  existing line-ending warnings remain informational.
- Local server build output changed from about 62.93 MB to 62.45 MB on disk. This is
  not a production RSS measurement and is not used to claim memory savings.

## Release limitation

- Database/schema/data were not touched. No commit, push, Railway setting, migration,
  or deployment occurred. Real savings require an authorized exact-revision release
  followed by Replica-view and runtime-memory log observation for 24 hours.
