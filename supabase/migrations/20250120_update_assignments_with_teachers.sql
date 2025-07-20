-- Update assignments table with teacher_id from teacher_group_assignments
-- This migration populates the teacher_id field in assignments based on 
-- existing teacher-group relationships

-- First, let's see what assignments need updating
WITH teacher_mappings AS (
    SELECT 
        a.id as assignment_id,
        a.subject_group_id,
        tga.teacher_id
    FROM assignments a
    LEFT JOIN teacher_group_assignments tga ON 
        a.subject_group_id = tga.subject_group_id 
        AND tga.academic_year = '2025-2026'
    WHERE a.teacher_id IS NULL 
    AND tga.teacher_id IS NOT NULL
)
UPDATE assignments 
SET 
    teacher_id = tm.teacher_id,
    updated_at = NOW()
FROM teacher_mappings tm
WHERE assignments.id = tm.assignment_id;

-- Create a function to automatically sync teacher assignments
CREATE OR REPLACE FUNCTION sync_teacher_to_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- When a teacher_group_assignment is inserted or updated
    -- Update all related assignments
    UPDATE assignments
    SET 
        teacher_id = NEW.teacher_id,
        updated_at = NOW()
    WHERE 
        subject_group_id = NEW.subject_group_id
        AND (teacher_id IS NULL OR teacher_id != NEW.teacher_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep assignments in sync
DROP TRIGGER IF EXISTS sync_teacher_assignments_trigger ON teacher_group_assignments;
CREATE TRIGGER sync_teacher_assignments_trigger
AFTER INSERT OR UPDATE ON teacher_group_assignments
FOR EACH ROW
EXECUTE FUNCTION sync_teacher_to_assignments();

-- Handle deletions
CREATE OR REPLACE FUNCTION unset_teacher_from_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- When a teacher_group_assignment is deleted
    -- Remove teacher from related assignments
    UPDATE assignments
    SET 
        teacher_id = NULL,
        updated_at = NOW()
    WHERE 
        subject_group_id = OLD.subject_group_id
        AND teacher_id = OLD.teacher_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion
DROP TRIGGER IF EXISTS unset_teacher_assignments_trigger ON teacher_group_assignments;
CREATE TRIGGER unset_teacher_assignments_trigger
AFTER DELETE ON teacher_group_assignments
FOR EACH ROW
EXECUTE FUNCTION unset_teacher_from_assignments();

-- Add comment explaining the relationship
COMMENT ON COLUMN assignments.teacher_id IS 'Teacher assigned to this class. Automatically synced from teacher_group_assignments table.';