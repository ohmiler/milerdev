# Dedicated retention service

This is a prepared Railway service configuration, not an active production schedule. Do not select it for the web service: its process exits instead of serving HTTP.

The daily schedule is 20:00 UTC (03:00 Asia/Bangkok the following day). Its start command reports counts only. It neither migrates the database nor starts Next.js. The CLI closes its dedicated database connection on completion; Railway skips later scheduled runs while a previous execution is still active.

After the owner authorizes the specific environment and read-only operation:

1. Create a separate service from this repository and select `/deployment/privacy-retention/railway.json` as its config file, keeping the repository root as the build root.
2. Use the approved application revision and confirm migration 0022 is already installed by the application deployment. Do not run migrations in the cron service.
3. The owner supplies `DATABASE_URL` through Railway's variable settings/reference. Do not place its value in Git, messages or command output. Do not attach payment, email or video secrets. Set no public domain or HTTP healthcheck.
4. Run a single count-only execution first. Inspect counts, dates and manual-review counts. Configure notifications for failure, lock contention, skipped execution, persistent backlog or missing daily execution.
5. Only after explicit approval of production deletion, change the start command **in this config** to `npm run privacy:retention -- --apply --confirm-policy=privacy-2026-09-13`. File configuration overrides dashboard start-command settings. Review and deploy that change to this service.

Each invocation is bounded. If old outbox rows remain, the runner postpones raw cleanup; use further approved bounded executions until the backlog clears. A successful process exit alone does not prove zero backlog: inspect `remaining` and `manualReview`. Suspending the cron service stops future executions, but does not reverse completed deletion. Backup expiry and legal holds require a separate operating policy.

Do not claim automatic retention enforcement while the command remains count-only or the service has not been created. The configuration has been checked locally; no Railway service or production data was accessed during preparation.

References: [Railway configuration reference](https://docs.railway.com/config-as-code/reference), [Railway cron jobs](https://docs.railway.com/cron-jobs), [approved retention policy](../../docs/privacy-retention-video-review.md).
