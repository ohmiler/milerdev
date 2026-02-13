-- Add unique constraints to prevent concurrent duplicate enrollments and coupon usage
ALTER TABLE `enrollments` ADD CONSTRAINT `uq_enrollment_user_course` UNIQUE(`user_id`,`course_id`);
--> statement-breakpoint
ALTER TABLE `coupon_usages` ADD CONSTRAINT `uq_coupon_user_course` UNIQUE(`coupon_id`,`user_id`,`course_id`);