-- Create bundles table
CREATE TABLE bundles (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create bundle_courses junction table
CREATE TABLE bundle_courses (
    id VARCHAR(36) PRIMARY KEY,
    bundle_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    order_index INT DEFAULT 0,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Add bundle_id to payments table
ALTER TABLE payments ADD COLUMN bundle_id VARCHAR(36) DEFAULT NULL AFTER course_id;
ALTER TABLE payments ADD FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL;
