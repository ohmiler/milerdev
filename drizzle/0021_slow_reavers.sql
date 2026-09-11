CREATE TABLE `email_registrations` (
	`token_hash` char(64) NOT NULL,
	`email` varchar(255) NOT NULL,
	`return_to` varchar(2048) NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `email_registrations_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_email_registrations_email` ON `email_registrations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_email_registrations_expiry` ON `email_registrations` (`expires_at`);