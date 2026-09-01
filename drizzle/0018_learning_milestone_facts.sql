ALTER TABLE `analytics_events` ADD `learning_fact_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `learning_enrollment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `lesson_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `learning_fact_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `learning_enrollment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `course_id` varchar(36);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD `lesson_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `uq_analytics_learning_fact` UNIQUE(`event_name`,`learning_fact_id`);--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `uq_measurement_outbox_learning_fact` UNIQUE(`event_name`,`learning_fact_id`);--> statement-breakpoint
ALTER TABLE `measurement_outbox` DROP CONSTRAINT `chk_measurement_outbox_acquisition_identity`;--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `chk_measurement_outbox_identity` CHECK (
        (`measurement_outbox`.`event_name` = 'purchase_completed'
            AND `measurement_outbox`.`payment_id` IS NOT NULL AND `measurement_outbox`.`enrollment_id` IS NULL
            AND `measurement_outbox`.`learning_fact_id` IS NULL AND `measurement_outbox`.`learning_enrollment_id` IS NULL
            AND `measurement_outbox`.`course_id` IS NULL AND `measurement_outbox`.`lesson_id` IS NULL)
        OR (`measurement_outbox`.`event_name` = 'free_enrollment_completed'
            AND `measurement_outbox`.`payment_id` IS NULL AND `measurement_outbox`.`enrollment_id` IS NOT NULL
            AND `measurement_outbox`.`learning_fact_id` IS NULL AND `measurement_outbox`.`learning_enrollment_id` IS NULL
            AND `measurement_outbox`.`course_id` IS NULL AND `measurement_outbox`.`lesson_id` IS NULL)
        OR (`measurement_outbox`.`event_name` = 'lesson_completed'
            AND `measurement_outbox`.`payment_id` IS NULL AND `measurement_outbox`.`enrollment_id` IS NULL
            AND `measurement_outbox`.`learning_fact_id` IS NOT NULL AND `measurement_outbox`.`learning_enrollment_id` IS NOT NULL
            AND `measurement_outbox`.`course_id` IS NOT NULL AND `measurement_outbox`.`lesson_id` IS NOT NULL)
        OR (`measurement_outbox`.`event_name` = 'course_completed'
            AND `measurement_outbox`.`payment_id` IS NULL AND `measurement_outbox`.`enrollment_id` IS NULL
            AND `measurement_outbox`.`learning_fact_id` IS NOT NULL AND `measurement_outbox`.`learning_enrollment_id` IS NOT NULL
            AND `measurement_outbox`.`course_id` IS NOT NULL AND `measurement_outbox`.`lesson_id` IS NULL)
    );--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_learning_enrollment_id_enrollments_id_fk` FOREIGN KEY (`learning_enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `measurement_outbox_learning_enrollment_id_enrollments_id_fk` FOREIGN KEY (`learning_enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `measurement_outbox_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `measurement_outbox` ADD CONSTRAINT `measurement_outbox_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_analytics_learning_enrollment_id` ON `analytics_events` (`learning_enrollment_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_lesson_id` ON `analytics_events` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_learning_enrollment_id` ON `measurement_outbox` (`learning_enrollment_id`);--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_course_id` ON `measurement_outbox` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_measurement_outbox_lesson_id` ON `measurement_outbox` (`lesson_id`);
