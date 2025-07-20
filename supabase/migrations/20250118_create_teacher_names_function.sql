-- Create a function to get teacher names per group
CREATE OR REPLACE FUNCTION get_teacher_names_by_degree(degree_prefix TEXT)
RETURNS TABLE (
    subject_group_id UUID,
    teacher_names TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tga.subject_group_id,
        STRING_AGG(CONCAT(t.first_name, ' ', t.last_name), ', ' ORDER BY t.last_name, t.first_name) as teacher_names
    FROM teacher_group_assignments tga
    JOIN subject_groups sg ON tga.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    JOIN teachers t ON tga.teacher_id = t.id
    WHERE tga.academic_year = '2025-2026'
    AND s.code LIKE degree_prefix || '%'
    GROUP BY tga.subject_group_id
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_teacher_names_by_degree(TEXT) TO authenticated;

COMMENT ON FUNCTION get_teacher_names_by_degree IS 'Get concatenated teacher names for subject groups filtered by degree prefix';