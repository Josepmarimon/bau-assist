-- Create a function to get teachers for a specific group
CREATE OR REPLACE FUNCTION get_teachers_for_group(group_id UUID)
RETURNS TABLE (
    teacher_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    department TEXT,
    ects_assigned DECIMAL,
    is_coordinator BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        t.id as teacher_id,
        t.first_name,
        t.last_name,
        t.email,
        t.department,
        tga.ects_assigned,
        tga.is_coordinator
    FROM teacher_group_assignments tga
    JOIN teachers t ON tga.teacher_id = t.id
    WHERE tga.subject_group_id = group_id
    AND tga.academic_year = '2025-2026'
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_teachers_for_group(UUID) TO authenticated;

COMMENT ON FUNCTION get_teachers_for_group IS 'Get all teachers assigned to a specific subject group';