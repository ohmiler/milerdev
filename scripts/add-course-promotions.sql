-- Add promotion fields to courses table
ALTER TABLE courses
  ADD COLUMN promo_price DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN promo_starts_at DATETIME DEFAULT NULL,
  ADD COLUMN promo_ends_at DATETIME DEFAULT NULL;
