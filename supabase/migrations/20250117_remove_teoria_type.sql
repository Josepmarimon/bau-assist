-- Remove 'Teoria' from classroom types
-- No classrooms are currently using this type

BEGIN;

-- Drop the existing check constraint
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_type_check;

-- Add the new check constraint without 'Teoria'
ALTER TABLE classrooms 
ADD CONSTRAINT classrooms_type_check 
CHECK (type IN ('Taller', 'Informàtica', 'Polivalent', 'Projectes', 'Seminari'));

-- Update the column comment
COMMENT ON COLUMN classrooms.type IS 'Classroom types: Taller (workshop), Informàtica (computer lab), Polivalent (multipurpose), Projectes (project rooms), Seminari (seminar)';

COMMIT;