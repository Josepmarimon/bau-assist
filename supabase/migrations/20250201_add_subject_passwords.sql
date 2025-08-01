-- Add password column to subjects table
ALTER TABLE subjects
ADD COLUMN password VARCHAR(255);

-- Add comment to explain the purpose
COMMENT ON COLUMN subjects.password IS 'Password for accessing subject teaching guides';

-- Create index on password for faster lookups
CREATE INDEX idx_subjects_password ON subjects(password);