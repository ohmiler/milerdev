CREATE TABLE `payment_course_grants` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`created_at` datetime,
	CONSTRAINT `payment_course_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_payment_course_grants_payment_course` UNIQUE(`payment_id`,`course_id`)
);
--> statement-breakpoint
ALTER TABLE `payment_course_grants` ADD CONSTRAINT `payment_course_grants_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_course_grants` ADD CONSTRAINT `payment_course_grants_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_payment_course_grants_course_id` ON `payment_course_grants` (`course_id`);