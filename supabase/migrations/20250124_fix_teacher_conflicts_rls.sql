-- Fix RLS recursion issue by recreating teacher conflict functions as SECURITY DEFINER

-- Drop existing functions
DROP FUNCTION IF EXISTS check_teacher_schedule_conflicts CASCADE;
DROP FUNCTION IF EXISTS check_subject_group_teacher_conflicts CASCADE;

-- Recreate check_teacher_schedule_conflicts with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_teacher_schedule_conflicts(
    p_teacher_id UUID,
    p_time_slot_id UUID,
    p_semester_id UUID,
    p_exclude_assignment_id UUID DEFAULT NULL
) RETURNS TABLE(
    assignment_id UUID,
    subject_name VARCHAR,
    group_code VARCHAR,
    semester_name VARCHAR
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        s.name::VARCHAR as subject_name,
        sg.group_code::VARCHAR,
        sem.name::VARCHAR as semester_name
    FROM assignments a
    JOIN subject_groups sg ON a.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    JOIN semesters sem ON a.semester_id = sem.id
    -- Check teacher assignments through teacher_group_assignments
    JOIN teacher_group_assignments tga ON 
        tga.subject_group_id = a.subject_group_id 
        AND tga.teacher_id = p_teacher_id
    WHERE 
        a.time_slot_id = p_time_slot_id
        AND a.semester_id = p_semester_id  -- Only check conflicts within the same semester
        AND (p_exclude_assignment_id IS NULL OR a.id != p_exclude_assignment_id);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_teacher_schedule_conflicts TO authenticated;

-- Comment the function
COMMENT ON FUNCTION check_teacher_schedule_conflicts IS 'Checks if a teacher has schedule conflicts within a specific semester. Only returns conflicts for the same time slot within the same semester. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Recreate check_subject_group_teacher_conflicts with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_subject_group_teacher_conflicts(
    p_subject_group_id UUID,
    p_time_slot_id UUID,
    p_semester_id UUID,
    p_exclude_assignment_id UUID DEFAULT NULL
) RETURNS TABLE(
    teacher_id UUID,
    teacher_name VARCHAR,
    conflicting_subject VARCHAR,
    conflicting_group VARCHAR
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tga.teacher_id,
        (t.first_name || ' ' || t.last_name)::VARCHAR as teacher_name,
        s.name::VARCHAR as conflicting_subject,
        sg_conflict.group_code::VARCHAR as conflicting_group
    FROM teacher_group_assignments tga
    JOIN teachers t ON tga.teacher_id = t.id
    -- Find other assignments for this teacher
    JOIN teacher_group_assignments tga_conflict ON 
        tga_conflict.teacher_id = tga.teacher_id
        AND tga_conflict.subject_group_id != p_subject_group_id
    -- Check if those assignments have schedule conflicts
    JOIN assignments a ON 
        a.subject_group_id = tga_conflict.subject_group_id
        AND a.time_slot_id = p_time_slot_id
        AND a.semester_id = p_semester_id
        AND (p_exclude_assignment_id IS NULL OR a.id != p_exclude_assignment_id)
    JOIN subject_groups sg_conflict ON tga_conflict.subject_group_id = sg_conflict.id
    JOIN subjects s ON sg_conflict.subject_id = s.id
    WHERE 
        tga.subject_group_id = p_subject_group_id
        AND tga.academic_year = '2025-2026';  -- Should be parameterized in production
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_subject_group_teacher_conflicts TO authenticated;

-- Comment the function
COMMENT ON FUNCTION check_subject_group_teacher_conflicts IS 'Checks if any teacher assigned to a subject group has schedule conflicts within the specified semester. Uses SECURITY DEFINER to avoid RLS recursion.';