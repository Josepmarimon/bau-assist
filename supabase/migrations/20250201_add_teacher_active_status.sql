-- Add is_active column to teachers table to soft delete teachers
-- This allows us to keep historical data while hiding inactive teachers

-- Add is_active column with default true
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing teachers to be active
UPDATE teachers 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for performance when filtering active teachers
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers(is_active);

-- Add comment explaining the column
COMMENT ON COLUMN teachers.is_active IS 'Indicates if the teacher is currently active at BAU. Set to false for teachers who no longer work here but need to be kept for historical records.';