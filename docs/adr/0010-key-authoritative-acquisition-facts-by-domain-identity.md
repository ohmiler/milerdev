# Key authoritative acquisition facts by domain identity

MilerDev will reuse one transactional measurement outbox while keying paid acquisition facts by `paymentId` and free or 100%-coupon acquisition facts by each first-created `enrollmentId`; an outbox entry carries exactly one of those identities so retries remain idempotent without treating free access as a paid purchase.
