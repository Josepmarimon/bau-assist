-- This migration prepares the assignments table for direct teacher-group assignments
-- We keep teaching_assignments for now as it contains important data

-- Add a comment to clarify the purpose of the assignments table
COMMENT ON TABLE assignments IS 'Main table for scheduling: links teachers, subject groups, classrooms, and time slots';

-- Add indexes for better performance on teacher queries
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_group ON assignments(subject_group_id);

-- Create a view to easily see teacher assignments by subject group
CREATE OR REPLACE VIEW teacher_subject_group_assignments AS
SELECT DISTINCT
    sg.id as subject_group_id,
    sg.group_code,
    sg.subject_id,
    s.code as subject_code,
    s.name as subject_name,
    t.id as teacher_id,
    CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
    t.email as teacher_email,
    t.department as teacher_department,
    ta.ects_assigned,
    ta.is_coordinator
FROM subject_groups sg
JOIN subjects s ON sg.subject_id = s.id
JOIN course_offerings co ON co.subject_id = s.id
JOIN teaching_assignments ta ON ta.course_offering_id = co.id
JOIN teachers t ON ta.teacher_id = t.id
ORDER BY s.code, sg.group_code, t.first_name, t.last_name;

-- Grant access to the view
GRANT SELECT ON teacher_subject_group_assignments TO authenticated;

COMMENT ON VIEW teacher_subject_group_assignments IS 'View showing which teachers are assigned to which subject groups through course offerings';