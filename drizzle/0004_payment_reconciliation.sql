ALTER TABLE `payments` ADD `retry_count` int DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `payments` ADD `last_retry_at` datetime;