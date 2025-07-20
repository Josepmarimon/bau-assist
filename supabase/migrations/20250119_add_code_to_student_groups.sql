-- Add code column to student_groups table
ALTER TABLE student_groups ADD COLUMN code VARCHAR(20);

-- Update existing records to use name as code
UPDATE student_groups SET code = name WHERE code IS NULL;

-- Make code not null and unique after populating
ALTER TABLE student_groups ALTER COLUMN code SET NOT NULL;
ALTER TABLE student_groups ADD CONSTRAINT student_groups_code_unique UNIQUE (code);

-- Add index for better performance
CREATE INDEX idx_student_groups_code ON student_groups(code);