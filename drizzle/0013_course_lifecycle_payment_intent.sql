ALTER TABLE `payments` ADD `coupon_id` varchar(36);--> statement-breakpoint
CREATE INDEX `idx_payments_coupon_id` ON `payments` (`coupon_id`);