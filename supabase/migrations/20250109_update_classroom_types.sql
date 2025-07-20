-- First, we need to drop the existing check constraint
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_type_check;

-- Add the new check constraint with updated types
-- Note: keeping 'teoria' and 'informatica' for backward compatibility
-- Adding: 'projectes' (for Aules de projectes) and 'seminari'
ALTER TABLE classrooms 
ADD CONSTRAINT classrooms_type_check 
CHECK (type IN ('teoria', 'taller', 'informatica', 'polivalent', 'projectes', 'seminari'));

-- Update existing classrooms based on their names or current types
-- This is optional and depends on how you want to map existing data
UPDATE classrooms 
SET type = 'projectes' 
WHERE type = 'polivalent' AND name LIKE '%Projectes%';

-- Add comment to document the classroom types
COMMENT ON COLUMN classrooms.type IS 'Classroom types: teoria (theory), taller (workshop), informatica (computer lab), polivalent (multipurpose), projectes (project rooms), seminari (seminar)';