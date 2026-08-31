ALTER TABLE `analytics_events` ADD `exposure_id` varchar(36);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `uq_analytics_exposure_id` UNIQUE(`exposure_id`);