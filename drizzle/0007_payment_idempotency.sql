ALTER TABLE `payments` ADD `promptpay_trans_ref` varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payments_promptpay_trans_ref` ON `payments` (`promptpay_trans_ref`);--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`payment_id` varchar(36),
	`processed_at` datetime,
	`created_at` datetime,
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stripe_events` ADD CONSTRAINT `stripe_events_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_stripe_events_payment_id` ON `stripe_events` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_stripe_events_type` ON `stripe_events` (`type`);
