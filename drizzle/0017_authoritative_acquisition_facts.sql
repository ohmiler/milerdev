ALTER TABLE `measurement_outbox` MODIFY COLUMN `payment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `enrollment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `enrollment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `uq_analytics_event_enrollment` UNIQUE(`event_name`,`enrollment_id`);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `uq_measurement_outbox_event_enrollment` UNIQUE(`event_name`,`enrollment_id`);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `chk_measurement_outbox_acquisition_identity` CHECK (
        (`measurement_outbox`.`event_name` = 'purchase_completed' AND `measurement_outbox`.`payment_id` IS NOT NULL AND `measurement_outbox`.`enrollment_id` IS NULL)
        OR (`measurement_outbox`.`event_name` = 'free_enrollment_completed' AND `measurement_outbox`.`payment_id` IS NULL AND `measurement_outbox`.`enrollment_id` IS NOT NULL)
    );--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `measurement_outbox_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_analytics_enrollment_id` ON `analytics_events` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_enrollment_id` ON `measurement_outbox` (`enrollment_id`);