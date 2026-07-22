CREATE TABLE `rate_limit_buckets` (
	`key_hash` char(64) NOT NULL,
	`count` int NOT NULL,
	`reset_at` datetime(3) NOT NULL,
	CONSTRAINT `rate_limit_buckets_key_hash` PRIMARY KEY(`key_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_buckets_reset_at` ON `rate_limit_buckets` (`reset_at`);