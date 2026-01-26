-- Add media table
CREATE TABLE IF NOT EXISTS `media` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `filename` varchar(255) NOT NULL,
    `original_name` varchar(255) NOT NULL,
    `mime_type` varchar(100) NOT NULL,
    `size` int NOT NULL,
    `url` text NOT NULL,
    `type` varchar(20) NOT NULL DEFAULT 'image',
    `uploaded_by` varchar(36),
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `media_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- Add tags table
CREATE TABLE IF NOT EXISTS `tags` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `name` varchar(100) NOT NULL UNIQUE,
    `slug` varchar(100) NOT NULL UNIQUE,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP
);

-- Add course_tags table
CREATE TABLE IF NOT EXISTS `course_tags` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `course_id` varchar(36) NOT NULL,
    `tag_id` varchar(36) NOT NULL,
    CONSTRAINT `course_tags_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `course_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS `idx_course_tags_course_id` ON `course_tags` (`course_id`);
CREATE INDEX IF NOT EXISTS `idx_course_tags_tag_id` ON `course_tags` (`tag_id`);

-- Add settings table
CREATE TABLE IF NOT EXISTS `settings` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `key` varchar(100) NOT NULL UNIQUE,
    `value` text,
    `type` varchar(20) NOT NULL DEFAULT 'string',
    `description` text,
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `updated_by` varchar(36),
    CONSTRAINT `settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- Add audit_logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `user_id` varchar(36),
    `action` varchar(50) NOT NULL,
    `entity_type` varchar(50) NOT NULL,
    `entity_id` varchar(36),
    `old_value` text,
    `new_value` text,
    `ip_address` varchar(45),
    `user_agent` text,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- Add indexes for audit_logs
CREATE INDEX `idx_audit_logs_user_id` ON `audit_logs` (`user_id`);
CREATE INDEX `idx_audit_logs_entity_type` ON `audit_logs` (`entity_type`);
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);

-- Add announcements table
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `title` varchar(255) NOT NULL,
    `content` text NOT NULL,
    `type` varchar(20) NOT NULL DEFAULT 'info',
    `target_role` varchar(20) NOT NULL DEFAULT 'all',
    `is_active` boolean DEFAULT true,
    `starts_at` datetime,
    `ends_at` datetime,
    `created_by` varchar(36),
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `announcements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- Add notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` varchar(36) NOT NULL PRIMARY KEY,
    `user_id` varchar(36) NOT NULL,
    `title` varchar(255) NOT NULL,
    `message` text,
    `type` varchar(20) NOT NULL DEFAULT 'info',
    `link` varchar(500),
    `is_read` boolean DEFAULT false,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- Add indexes for notifications
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);
CREATE INDEX `idx_notifications_is_read` ON `notifications` (`is_read`);
CREATE INDEX `idx_notifications_created_at` ON `notifications` (`created_at`);
