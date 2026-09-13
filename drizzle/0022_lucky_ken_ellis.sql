CREATE TABLE `privacy_consents` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36),
	`version` int NOT NULL,
	`analytics` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	CONSTRAINT `privacy_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `consent_id` varchar(64);--> statement-breakpoint
ALTER TABLE `privacy_consents` ADD CONSTRAINT `privacy_consents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_privacy_consents_user` ON `privacy_consents` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_privacy_consents_expiry` ON `privacy_consents` (`expires_at`);