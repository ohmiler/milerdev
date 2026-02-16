CREATE TABLE `analytics_events` (
	`id` varchar(36) NOT NULL,
	`event_name` varchar(100) NOT NULL,
	`user_id` varchar(36),
	`course_id` varchar(36),
	`bundle_id` varchar(36),
	`payment_id` varchar(36),
	`source` varchar(20) NOT NULL DEFAULT 'server',
	`metadata` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` datetime,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_bundle_id_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_analytics_event_name` ON `analytics_events` (`event_name`);
--> statement-breakpoint
CREATE INDEX `idx_analytics_created_at` ON `analytics_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_analytics_course_id` ON `analytics_events` (`course_id`);
--> statement-breakpoint
CREATE INDEX `idx_analytics_bundle_id` ON `analytics_events` (`bundle_id`);
--> statement-breakpoint
CREATE INDEX `idx_analytics_payment_id` ON `analytics_events` (`payment_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_analytics_event_payment` ON `analytics_events` (`event_name`,`payment_id`);
