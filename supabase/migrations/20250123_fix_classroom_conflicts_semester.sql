-- Update the check_classroom_week_conflicts function to include semester filtering
-- This fixes the issue where professor overlaps were incorrectly detected across different semesters

CREATE OR REPLACE FUNCTION check_classroom_week_conflicts(
    p_classroom_id UUID,
    p_time_slot_id UUID,
    p_week_numbers INTEGER[],
    p_exclude_assignment_id UUID DEFAULT NULL,
    p_semester_id UUID DEFAULT NULL
) RETURNS TABLE(
    assignment_id UUID,
    subject_name VARCHAR,
    group_code VARCHAR,
    conflicting_weeks INTEGER[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        s.name::VARCHAR as subject_name,
        sg.group_code::VARCHAR,
        CASE 
            WHEN ac.is_full_semester THEN p_week_numbers
            ELSE array(
                SELECT unnest(p_week_numbers) 
                INTERSECT 
                SELECT acw.week_number 
                FROM assignment_classroom_weeks acw 
                WHERE acw.assignment_classroom_id = ac.id
            )
        END as conflicting_weeks
    FROM assignments a
    JOIN assignment_classrooms ac ON a.id = ac.assignment_id
    JOIN subject_groups sg ON a.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    WHERE 
        ac.classroom_id = p_classroom_id
        AND a.time_slot_id = p_time_slot_id
        AND (p_exclude_assignment_id IS NULL OR a.id != p_exclude_assignment_id)
        AND (p_semester_id IS NULL OR a.semester_id = p_semester_id)  -- Filter by semester if provided
        AND (
            ac.is_full_semester = true 
            OR EXISTS (
                SELECT 1 
                FROM assignment_classroom_weeks acw 
                WHERE acw.assignment_classroom_id = ac.id 
                AND acw.week_number = ANY(p_week_numbers)
            )
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_classroom_week_conflicts TO authenticated;

-- Comment the function
COMMENT ON FUNCTION check_classroom_week_conflicts IS 'Checks for classroom conflicts considering weeks and semester. Only checks conflicts within the same semester when p_semester_id is provided.';