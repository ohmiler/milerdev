ALTER TABLE `courses` ADD `summary` varchar(300);--> statement-breakpoint
ALTER TABLE `courses` ADD `learning_outcomes` json;--> statement-breakpoint
ALTER TABLE `courses` ADD `target_audience` json;--> statement-breakpoint
ALTER TABLE `courses` ADD `prerequisites` json;--> statement-breakpoint
ALTER TABLE `courses` ADD `prerequisite_course_id` varchar(36);--> statement-breakpoint
ALTER TABLE `users` ADD `headline` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `profile_links` json;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_prerequisite_course_id_courses_id_fk` FOREIGN KEY (`prerequisite_course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;