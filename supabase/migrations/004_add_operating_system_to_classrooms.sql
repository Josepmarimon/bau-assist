-- Add operating_system field to classrooms table
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS operating_system TEXT;

-- Add a comment to explain the field
COMMENT ON COLUMN classrooms.operating_system IS 'Operating system installed in the classroom (e.g., Windows, macOS, Linux)';

-- Update existing computer classrooms with a default OS if needed (optional)
-- UPDATE classrooms 
-- SET operating_system = 'Windows' 
-- WHERE type = 'informatica' AND operating_system IS NULL;