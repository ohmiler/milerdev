CREATE TABLE `web_vitals` (
	`id` varchar(36) NOT NULL,
	`page_load_id` varchar(100) NOT NULL,
	`metric_name` varchar(10) NOT NULL,
	`route_family` varchar(40) NOT NULL,
	`device_class` varchar(10) NOT NULL,
	`release_identity` varchar(100) NOT NULL,
	`value` decimal(16,4) NOT NULL,
	`rating` varchar(20) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `web_vitals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_web_vitals_page_metric` UNIQUE(`page_load_id`,`metric_name`)
);
--> statement-breakpoint
CREATE INDEX `idx_web_vitals_updated_at` ON `web_vitals` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_web_vitals_release_route_metric_device` ON `web_vitals` (`release_identity`,`route_family`,`metric_name`,`device_class`);