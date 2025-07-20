-- Update classroom types to proper capitalization
-- Changes: informatica -> Informàtica, and capitalize first letter of all types

BEGIN;

-- First update the existing data to new capitalized format
UPDATE classrooms
SET type = CASE type
    WHEN 'informatica' THEN 'Informàtica'
    WHEN 'teoria' THEN 'Teoria'
    WHEN 'taller' THEN 'Taller'
    WHEN 'polivalent' THEN 'Polivalent'
    WHEN 'projectes' THEN 'Projectes'
    WHEN 'seminari' THEN 'Seminari'
    ELSE type
END,
updated_at = NOW()
WHERE type IN ('informatica', 'teoria', 'taller', 'polivalent', 'projectes', 'seminari');

-- Drop the existing check constraint
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_type_check;

-- Add the new check constraint with capitalized types
ALTER TABLE classrooms 
ADD CONSTRAINT classrooms_type_check 
CHECK (type IN ('Teoria', 'Taller', 'Informàtica', 'Polivalent', 'Projectes', 'Seminari'));

-- Update the column comment
COMMENT ON COLUMN classrooms.type IS 'Classroom types: Teoria (theory), Taller (workshop), Informàtica (computer lab), Polivalent (multipurpose), Projectes (project rooms), Seminari (seminar)';

COMMIT;