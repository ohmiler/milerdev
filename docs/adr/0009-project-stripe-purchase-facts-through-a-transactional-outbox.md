# Project Stripe purchase facts through a transactional outbox

> **Superseded on 2026-10-04.** The owner retired the measurement pipeline (ADR 0011, decision 5): domain paths no longer write measurement facts, and collection, projection, and attribution were removed. The tables remain until a separate migration drops them. Kept for history.

MilerDev will copy an optional server-validated product exposure identity onto each immutable local Stripe payment attempt, then enqueue `purchase_completed` by payment identity in the same transaction as the first verified `pending` to `completed` transition and enrollment writes. A best-effort projector and targeted reconciliation may retry the additive outbox into `analytics_events`, but projection failure never reverses payment or access, replay and success-page fulfillment cannot create a second fact, and code rollback remains compatible with the nullable attribution columns and retained outbox table.
