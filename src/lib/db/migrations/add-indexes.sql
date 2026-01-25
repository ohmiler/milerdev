-- Database indexes for performance optimization
-- Run this manually or via migration

-- Enrollments: Composite index for user-course lookups (most common query)
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course 
ON enrollments(user_id, course_id);

-- Enrollments: Index for user's courses listing
CREATE INDEX IF NOT EXISTS idx_enrollments_user_enrolled 
ON enrollments(user_id, enrolled_at DESC);

-- Lesson Progress: Composite index for user-lesson lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson 
ON lesson_progress(user_id, lesson_id);

-- Lesson Progress: Index for completed lessons by user
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed 
ON lesson_progress(user_id, completed);

-- Lessons: Index for course lessons ordering
CREATE INDEX IF NOT EXISTS idx_lessons_course_order 
ON lessons(course_id, order_index);

-- Courses: Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_courses_slug 
ON courses(slug);

-- Courses: Index for status filtering
CREATE INDEX IF NOT EXISTS idx_courses_status 
ON courses(status);

-- Payments: Index for user payments
CREATE INDEX IF NOT EXISTS idx_payments_user 
ON payments(user_id, created_at DESC);

-- Payments: Index for course payments
CREATE INDEX IF NOT EXISTS idx_payments_course_status 
ON payments(course_id, status);
