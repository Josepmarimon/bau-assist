-- Migration to fix teacher synchronization system
-- This ensures all assignments have the correct teacher assigned

-- First, let's fix the sync function to handle multiple teachers better
CREATE OR REPLACE FUNCTION sync_teacher_to_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- When a teacher_group_assignment is inserted or updated
    -- Update all related assignments
    -- If there are multiple teachers, use the first one (by teacher_id)
    UPDATE assignments
    SET 
        teacher_id = (
            SELECT teacher_id 
            FROM teacher_group_assignments 
            WHERE subject_group_id = NEW.subject_group_id 
            AND academic_year = NEW.academic_year
            ORDER BY teacher_id
            LIMIT 1
        ),
        updated_at = NOW()
    WHERE 
        subject_group_id = NEW.subject_group_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix all current mismatches
-- Step 1: Update assignments with missing teachers
WITH teacher_updates AS (
    SELECT DISTINCT ON (a.id)
        a.id as assignment_id,
        tga.teacher_id
    FROM assignments a
    JOIN teacher_group_assignments tga ON 
        a.subject_group_id = tga.subject_group_id 
        AND tga.academic_year = '2025-2026'
    WHERE a.teacher_id IS NULL
    ORDER BY a.id, tga.teacher_id
)
UPDATE assignments 
SET 
    teacher_id = tu.teacher_id,
    updated_at = NOW()
FROM teacher_updates tu
WHERE assignments.id = tu.assignment_id;

-- Step 2: Update assignments with mismatched teachers
WITH correct_teachers AS (
    SELECT DISTINCT ON (a.id)
        a.id as assignment_id,
        tga.teacher_id as correct_teacher_id
    FROM assignments a
    JOIN teacher_group_assignments tga ON 
        a.subject_group_id = tga.subject_group_id 
        AND tga.academic_year = '2025-2026'
    WHERE a.teacher_id IS NOT NULL 
    AND a.teacher_id NOT IN (
        SELECT teacher_id 
        FROM teacher_group_assignments 
        WHERE subject_group_id = a.subject_group_id 
        AND academic_year = '2025-2026'
    )
    ORDER BY a.id, tga.teacher_id
)
UPDATE assignments 
SET 
    teacher_id = ct.correct_teacher_id,
    updated_at = NOW()
FROM correct_teachers ct
WHERE assignments.id = ct.assignment_id;

-- Create a more robust trigger that handles edge cases
CREATE OR REPLACE FUNCTION ensure_teacher_sync_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- When an assignment is created or its subject_group_id is updated
    -- Automatically assign the teacher if available
    IF (TG_OP = 'INSERT' OR NEW.subject_group_id != OLD.subject_group_id) THEN
        NEW.teacher_id = (
            SELECT teacher_id 
            FROM teacher_group_assignments 
            WHERE subject_group_id = NEW.subject_group_id 
            AND academic_year = '2025-2026'
            ORDER BY teacher_id
            LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger on assignments table for automatic sync on insert/update
DROP TRIGGER IF EXISTS ensure_teacher_on_assignment_trigger ON assignments;
CREATE TRIGGER ensure_teacher_on_assignment_trigger
BEFORE INSERT OR UPDATE OF subject_group_id ON assignments
FOR EACH ROW
EXECUTE FUNCTION ensure_teacher_sync_on_assignment();

-- Create a maintenance function that can be called periodically
CREATE OR REPLACE FUNCTION sync_all_teachers()
RETURNS TABLE(updated_count integer) AS $$
DECLARE
    count_updated integer;
BEGIN
    -- Update all assignments to have the correct teacher
    WITH updates AS (
        UPDATE assignments a
        SET 
            teacher_id = (
                SELECT teacher_id 
                FROM teacher_group_assignments tga
                WHERE tga.subject_group_id = a.subject_group_id 
                AND tga.academic_year = '2025-2026'
                ORDER BY teacher_id
                LIMIT 1
            ),
            updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 
            FROM teacher_group_assignments tga
            WHERE tga.subject_group_id = a.subject_group_id 
            AND tga.academic_year = '2025-2026'
        )
        AND (
            a.teacher_id IS NULL 
            OR a.teacher_id NOT IN (
                SELECT teacher_id 
                FROM teacher_group_assignments 
                WHERE subject_group_id = a.subject_group_id 
                AND academic_year = '2025-2026'
            )
        )
        RETURNING 1
    )
    SELECT COUNT(*)::integer INTO count_updated FROM updates;
    
    RETURN QUERY SELECT count_updated;
END;
$$ LANGUAGE plpgsql;

-- Run the sync function to fix all current issues
SELECT sync_all_teachers();

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_assignments_subject_group_teacher 
ON assignments(subject_group_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_group_assignments_lookup 
ON teacher_group_assignments(subject_group_id, academic_year, teacher_id);

-- Add a comment explaining the system
COMMENT ON FUNCTION sync_all_teachers() IS 
'Maintenance function to ensure all assignments have the correct teacher assigned based on teacher_group_assignments. 
Run this if you notice teachers not showing up in the UI. 
Returns the number of assignments updated.';