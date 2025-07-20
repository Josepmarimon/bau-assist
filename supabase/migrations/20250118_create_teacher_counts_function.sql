-- Create a function to get teacher counts per group
CREATE OR REPLACE FUNCTION get_teacher_counts_by_degree(degree_prefix TEXT)
RETURNS TABLE (
    subject_group_id UUID,
    teacher_count INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tga.subject_group_id,
        COUNT(DISTINCT tga.teacher_id)::INT as teacher_count
    FROM teacher_group_assignments tga
    JOIN subject_groups sg ON tga.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    WHERE tga.academic_year = '2025-2026'
    AND s.code LIKE degree_prefix || '%'
    GROUP BY tga.subject_group_id
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_teacher_counts_by_degree(TEXT) TO authenticated;

COMMENT ON FUNCTION get_teacher_counts_by_degree IS 'Get teacher counts for subject groups filtered by degree prefix';