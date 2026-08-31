# Project optional measurement facts with idempotent identities

MilerDev will keep optional analytics as a projection that cannot change payment, enrollment, learning progress, or certificate truth. Product-exposure identities are random, short-lived, generated only after an eligible detail page commits in the browser, validated against server-side published and purchasable state, and persisted through an additive nullable idempotency identity; later authoritative domain milestones use a transactional outbox so domain commits never depend on analytics delivery.

This keeps migrations backward-compatible with existing writers, makes browser retry and duplicate delivery safe, and allows analytics collection or projection to be disabled and rolled back without reversing business records.
