ALTER TABLE `users` ADD `deactivated_at` datetime;--> statement-breakpoint
CREATE INDEX `idx_users_deactivated_at` ON `users` (`deactivated_at`);