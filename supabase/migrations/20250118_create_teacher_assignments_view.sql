-- Create a view to get all teacher assignments with subject and group details
CREATE OR REPLACE VIEW teacher_assignments_view AS
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
ORDER BY t.last_name, t.first_name, s.code, sg.group_code;

-- Grant access to authenticated users
GRANT SELECT ON teacher_assignments_view TO authenticated;

COMMENT ON VIEW teacher_assignments_view IS 'Complete view of teacher assignments including subject and group details';