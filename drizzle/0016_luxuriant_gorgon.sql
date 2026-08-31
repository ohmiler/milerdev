CREATE TABLE `measurement_outbox` (
	`id` varchar(36) NOT NULL,
	`event_name` varchar(100) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`attempt_count` int NOT NULL DEFAULT 0,
	`last_attempt_at` datetime,
	`last_error_code` varchar(64),
	`projected_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `measurement_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_measurement_outbox_event_payment` UNIQUE(`event_name`,`payment_id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `attributed_exposure_id` varchar(36);--> statement-breakpoint
ALTER TABLE `payments` ADD `attributed_exposure_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `measurement_outbox_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_projected_at` ON `measurement_outbox` (`projected_at`);--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_payment_id` ON `measurement_outbox` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_attributed_exposure_id` ON `analytics_events` (`attributed_exposure_id`);