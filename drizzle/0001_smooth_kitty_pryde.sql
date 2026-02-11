CREATE TABLE `affiliate_banners` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`image_url` text NOT NULL,
	`link_url` text NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `affiliate_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` varchar(20) NOT NULL DEFAULT 'info',
	`target_role` varchar(20) NOT NULL DEFAULT 'all',
	`is_active` boolean DEFAULT true,
	`starts_at` datetime,
	`ends_at` datetime,
	`created_by` varchar(36),
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(50) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36),
	`old_value` text,
	`new_value` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` datetime,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_tags` (
	`id` varchar(36) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `blog_post_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`excerpt` text,
	`content` text,
	`thumbnail_url` text,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`author_id` varchar(36),
	`published_at` datetime,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `bundle_courses` (
	`id` varchar(36) NOT NULL,
	`bundle_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`order_index` int DEFAULT 0,
	CONSTRAINT `bundle_courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bundles` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`thumbnail_url` text,
	`price` decimal(10,2) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `bundles_id` PRIMARY KEY(`id`),
	CONSTRAINT `bundles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`certificate_code` varchar(20) NOT NULL,
	`recipient_name` varchar(255) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`completed_at` datetime NOT NULL,
	`issued_at` datetime,
	`certificate_theme` varchar(20),
	`certificate_header_image` text,
	`revoked_at` datetime,
	`revoked_reason` text,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_certificate_code_unique` UNIQUE(`certificate_code`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usages` (
	`id` varchar(36) NOT NULL,
	`coupon_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36),
	`discount_amount` decimal(10,2) NOT NULL,
	`used_at` datetime,
	CONSTRAINT `coupon_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`discount_type` varchar(20) NOT NULL,
	`discount_value` decimal(10,2) NOT NULL,
	`min_purchase` decimal(10,2) DEFAULT '0',
	`max_discount` decimal(10,2),
	`usage_limit` int,
	`usage_count` int DEFAULT 0,
	`per_user_limit` int DEFAULT 1,
	`course_id` varchar(36),
	`is_active` boolean DEFAULT true,
	`starts_at` datetime,
	`expires_at` datetime,
	`created_at` datetime,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`type` varchar(20) NOT NULL DEFAULT 'info',
	`link` varchar(500),
	`is_read` boolean DEFAULT false,
	`created_at` datetime,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`course_id` varchar(36) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`display_name` varchar(255),
	`is_verified` boolean DEFAULT false,
	`is_hidden` boolean DEFAULT false,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(20) NOT NULL DEFAULT 'string',
	`description` text,
	`updated_at` datetime,
	`updated_by` varchar(36),
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `courses` ADD `certificate_color` varchar(20) DEFAULT 'blue';--> statement-breakpoint
ALTER TABLE `courses` ADD `certificate_header_image` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `certificate_badge` varchar(50);--> statement-breakpoint
ALTER TABLE `courses` ADD `preview_video_url` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `promo_price` decimal(10,2);--> statement-breakpoint
ALTER TABLE `courses` ADD `promo_starts_at` datetime;--> statement-breakpoint
ALTER TABLE `courses` ADD `promo_ends_at` datetime;--> statement-breakpoint
ALTER TABLE `payments` ADD `bundle_id` varchar(36);--> statement-breakpoint
ALTER TABLE `payments` ADD `item_title` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `reset_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `reset_expires` datetime;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_courses` ADD CONSTRAINT `bundle_courses_bundle_id_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_courses` ADD CONSTRAINT `bundle_courses_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_bundle_id_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON DELETE set null ON UPDATE no action;