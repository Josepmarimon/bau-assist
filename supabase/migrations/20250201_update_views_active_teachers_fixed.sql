-- Update views to filter out inactive teachers
-- This ensures that deactivated teachers don't appear in active interfaces

-- First drop existing views to avoid type conflicts
DROP VIEW IF EXISTS assignments_with_teachers CASCADE;
DROP VIEW IF EXISTS teacher_assignments_view CASCADE;

-- 1. Recreate assignments_with_teachers view to only show active teachers
CREATE VIEW assignments_with_teachers AS
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
    CASE 
        WHEN t.is_active = true THEN COALESCE(a.teacher_id, tga.teacher_id)
        ELSE NULL
    END as teacher_id,
    -- Include teacher details only if active
    CASE WHEN t.is_active = true THEN t.first_name ELSE NULL END as teacher_first_name,
    CASE WHEN t.is_active = true THEN t.last_name ELSE NULL END as teacher_last_name,
    CASE WHEN t.is_active = true THEN t.email ELSE NULL END as teacher_email,
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
    AND tga.academic_year = '2025-2026'
-- Join with teachers table
LEFT JOIN teachers t ON COALESCE(a.teacher_id, tga.teacher_id) = t.id;

-- Grant permissions
GRANT SELECT ON assignments_with_teachers TO authenticated;

-- Create RLS policy for the view (inherits from base tables)
ALTER VIEW assignments_with_teachers SET (security_invoker = true);

COMMENT ON VIEW assignments_with_teachers IS 
'Combines assignments with teacher information from both direct assignments and teacher_group_assignments, only showing active teachers';

-- 2. Recreate teacher_assignments_view to only show active teachers
CREATE VIEW teacher_assignments_view AS
SELECT 
    t.id as teacher_id,
    t.first_name,
    t.last_name,
    t.email,
    t.department,
    s.id as subject_id,
    s.code as subject_code,
    s.name as subject_name,
    s.credits,
    sg.id as group_id,
    sg.group_code,
    tga.ects_assigned,
    tga.academic_year
FROM teacher_group_assignments tga
JOIN teachers t ON tga.teacher_id = t.id
JOIN subject_groups sg ON tga.subject_group_id = sg.id
JOIN subjects s ON sg.subject_id = s.id
WHERE tga.academic_year = '2025-2026'
  AND t.is_active = true  -- Only show active teachers
ORDER BY t.last_name, t.first_name, s.code, sg.group_code;

-- Grant access to authenticated users
GRANT SELECT ON teacher_assignments_view TO authenticated;

COMMENT ON VIEW teacher_assignments_view IS 'Complete view of teacher assignments including subject and group details, only showing active teachers';

-- 3. Update any functions that return teachers to filter inactive ones
CREATE OR REPLACE FUNCTION get_teachers_for_group(group_id UUID)
RETURNS TABLE (
    teacher_id UUID,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    is_coordinator BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        t.id as teacher_id,
        t.first_name,
        t.last_name,
        CONCAT(t.first_name, ' ', t.last_name) as full_name,
        tga.is_coordinator
    FROM teacher_group_assignments tga
    JOIN teachers t ON tga.teacher_id = t.id
    WHERE tga.subject_group_id = group_id
    AND tga.academic_year = '2025-2026'
    AND t.is_active = true  -- Only return active teachers
    ORDER BY tga.is_coordinator DESC, t.last_name, t.first_name;
$$;

-- 4. Create a view specifically for listing active teachers
CREATE OR REPLACE VIEW active_teachers AS
SELECT 
    id,
    user_id,
    code,
    id_profe,
    first_name,
    last_name,
    email,
    department,
    contract_type,
    max_hours,
    created_at,
    updated_at
FROM teachers
WHERE is_active = true
ORDER BY last_name, first_name;

-- Grant permissions
GRANT SELECT ON active_teachers TO authenticated;

COMMENT ON VIEW active_teachers IS 'Lists only active teachers, excluding those who no longer work at BAU';

-- 5. Update the teacher names function to only return active teachers
CREATE OR REPLACE FUNCTION get_teacher_names(degree_prefix TEXT)
RETURNS TABLE (
    teacher_name TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
    FROM teacher_group_assignments tga
    JOIN subject_groups sg ON tga.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    JOIN teachers t ON tga.teacher_id = t.id
    WHERE tga.academic_year = '2025-2026'
    AND s.code LIKE degree_prefix || '%'
    AND t.is_active = true  -- Only include active teachers
    ORDER BY teacher_name;
$$;