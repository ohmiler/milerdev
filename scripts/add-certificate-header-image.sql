-- Add certificate_header_image to courses table
ALTER TABLE courses ADD COLUMN certificate_header_image TEXT DEFAULT NULL;

-- Add certificate_header_image to certificates table (snapshot)
ALTER TABLE certificates ADD COLUMN certificate_header_image TEXT DEFAULT NULL;
