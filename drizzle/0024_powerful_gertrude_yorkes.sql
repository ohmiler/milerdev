CREATE TABLE `course_sections` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`order_index` int NOT NULL,
	`created_at` datetime,
	CONSTRAINT `course_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_quiz_attempts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`total` int NOT NULL,
	`answers` json NOT NULL,
	`submitted_at` datetime NOT NULL,
	CONSTRAINT `lesson_quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_quiz_questions` (
	`id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`prompt` text NOT NULL,
	`options` json NOT NULL,
	`explanation` text,
	`order_index` int NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `lesson_quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lessons` ADD `section_id` varchar(36);--> statement-breakpoint
ALTER TABLE `course_sections` ADD CONSTRAINT `course_sections_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_quiz_attempts` ADD CONSTRAINT `lesson_quiz_attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_quiz_attempts` ADD CONSTRAINT `lesson_quiz_attempts_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_quiz_questions` ADD CONSTRAINT `lesson_quiz_questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_course_sections_course_id` ON `course_sections` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_quiz_attempts_lesson_user` ON `lesson_quiz_attempts` (`lesson_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_quiz_attempts_user_id` ON `lesson_quiz_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_quiz_questions_lesson_id` ON `lesson_quiz_questions` (`lesson_id`);--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_section_id_course_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `course_sections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_lessons_section_id` ON `lessons` (`section_id`);