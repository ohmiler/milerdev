CREATE TABLE `doc_groups` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`order_index` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `doc_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `doc_groups_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `docs` (
	`id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` text,
	`order_index` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`view_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `docs_id` PRIMARY KEY(`id`),
	CONSTRAINT `docs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `blog_posts` ADD `view_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `docs` ADD CONSTRAINT `docs_group_id_doc_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `doc_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_docs_group_id` ON `docs` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_docs_status` ON `docs` (`status`);