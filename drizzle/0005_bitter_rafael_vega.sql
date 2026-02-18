CREATE INDEX IF NOT EXISTS `idx_blog_posts_status` ON `blog_posts` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_blog_posts_published_at` ON `blog_posts` (`published_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bundle_courses_bundle_id` ON `bundle_courses` (`bundle_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_certificates_user_id` ON `certificates` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_lesson_progress_user_id` ON `lesson_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_lesson_progress_lesson_id` ON `lesson_progress` (`lesson_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_lessons_course_id` ON `lessons` (`course_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notifications_user_id` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_payments_user_id` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_payments_created_at` ON `payments` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_payments_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_reviews_course_hidden` ON `reviews` (`course_id`,`is_hidden`);