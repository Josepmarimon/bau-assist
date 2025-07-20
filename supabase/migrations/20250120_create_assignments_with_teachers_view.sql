-- Create a view that combines assignments with teacher information
-- This avoids RLS policy issues while providing a clean interface

CREATE OR REPLACE VIEW assignments_with_teachers AS
SELECT 
    a.id,
    a.semester_id,
    a.subject_id,
    a.subject_group_id,
    a.student_group_id,
    a.classroom_id,
    a.time_slot_id,
    a.hours_per_week,
    a.color,
    a.notes,
    a.created_at,
    a.updated_at,
    a.created_by,
    -- Get teacher information from teacher_group_assignments
    COALESCE(
        a.teacher_id,  -- First try direct assignment
        tga.teacher_id -- Then try group assignment
    ) as teacher_id,
    -- Include teacher details
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    t.email as teacher_email,
    -- Include related data
    sub.code as subject_code,
    sub.name as subject_name,
    sub.credits as subject_credits,
    sub.year as subject_year,
    sub.type as subject_type,
    sg.name as student_group_name,
    sg.year as student_group_year,
    sg.shift as student_group_shift,
    c.code as classroom_code,
    c.name as classroom_name,
    c.building as classroom_building,
    c.capacity as classroom_capacity,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.slot_type
FROM assignments a
-- Join with subjects
LEFT JOIN subjects sub ON a.subject_id = sub.id
-- Join with student groups
LEFT JOIN student_groups sg ON a.student_group_id = sg.id
-- Join with classrooms
LEFT JOIN classrooms c ON a.classroom_id = c.id
-- Join with time slots
LEFT JOIN time_slots ts ON a.time_slot_id = ts.id
-- Join with teacher_group_assignments to get teacher
LEFT JOIN teacher_group_assignments tga ON 
    a.subject_group_id = tga.subject_group_id 
    AND tga.academic_year = '2025-2026'  -- This should be dynamic in production
-- Join with teachers table
LEFT JOIN teachers t ON COALESCE(a.teacher_id, tga.teacher_id) = t.id;

-- Grant permissions
GRANT SELECT ON assignments_with_teachers TO authenticated;

-- Create RLS policy for the view (inherits from base tables)
ALTER VIEW assignments_with_teachers SET (security_invoker = true);

-- Create an index to improve performance
CREATE INDEX IF NOT EXISTS idx_teacher_group_assignments_lookup 
ON teacher_group_assignments(subject_group_id, academic_year);

-- Comment the view for documentation
COMMENT ON VIEW assignments_with_teachers IS 
'Combines assignments with teacher information from both direct assignments and teacher_group_assignments, avoiding RLS recursion issues';