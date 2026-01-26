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
