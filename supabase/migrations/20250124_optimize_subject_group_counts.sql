-- Migration: Optimize subject group count queries
-- Purpose: Create efficient views and functions to reduce N+1 queries and improve performance

-- 1. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_code_year_semester ON subjects(code, year, semester);
CREATE INDEX IF NOT EXISTS idx_subjects_itinerari ON subjects("ID Itinerari") WHERE "ID Itinerari" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subject_groups_subject_id ON subject_groups(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_group_assignments_group_id ON teacher_group_assignments(subject_group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_group_id ON assignments(subject_group_id) WHERE subject_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subject_groups_composite ON subject_groups(subject_id, semester_id);

-- 2. Create view for subject statistics
CREATE OR REPLACE VIEW subject_statistics AS
SELECT 
    s.id as subject_id,
    s.code,
    s.name,
    s.credits,
    s.year,
    s.semester,
    s.type,
    s.department,
    s.active,
    s."ID Itinerari" as itinerari,
    COUNT(DISTINCT sg.id) as group_count,
    COUNT(DISTINCT tga.teacher_id) as teacher_count,
    COUNT(DISTINCT a.id) as assignment_count,
    COUNT(DISTINCT ss.software_id) as software_count,
    COALESCE(SUM(sg.max_students), 0) as total_capacity
FROM subjects s
LEFT JOIN subject_groups sg ON s.id = sg.subject_id
LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id
LEFT JOIN assignments a ON sg.id = a.subject_group_id
LEFT JOIN subject_software ss ON s.id = ss.subject_id
GROUP BY s.id;

-- Grant permissions
GRANT SELECT ON subject_statistics TO authenticated;

-- 3. Create RPC function for efficient subject loading with counts
CREATE OR REPLACE FUNCTION get_subjects_with_counts(
    p_degree_prefix TEXT DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_semester TEXT DEFAULT NULL,
    p_itinerari TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    credits INT,
    year INT,
    semester VARCHAR,
    type VARCHAR,
    department VARCHAR,
    active BOOLEAN,
    itinerari VARCHAR,
    group_count BIGINT,
    teacher_count BIGINT,
    assignment_count BIGINT,
    total_capacity NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.code,
        s.name,
        s.credits,
        s.year,
        s.semester,
        s.type,
        s.department,
        s.active,
        s."ID Itinerari" as itinerari,
        COUNT(DISTINCT sg.id) as group_count,
        COUNT(DISTINCT tga.teacher_id) as teacher_count,
        COUNT(DISTINCT a.id) as assignment_count,
        COALESCE(SUM(sg.max_students), 0) as total_capacity
    FROM subjects s
    LEFT JOIN subject_groups sg ON s.id = sg.subject_id
    LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id AND tga.academic_year = '2025-2026'
    LEFT JOIN assignments a ON sg.id = a.subject_group_id
    WHERE 
        (p_degree_prefix IS NULL OR s.code LIKE p_degree_prefix || '%')
        AND (p_year IS NULL OR s.year = p_year)
        AND (p_semester IS NULL OR s.semester = p_semester)
        AND (p_itinerari IS NULL OR s."ID Itinerari" = p_itinerari)
        AND (p_search_term IS NULL OR 
             LOWER(s.name) LIKE '%' || LOWER(p_search_term) || '%' OR 
             LOWER(s.code) LIKE '%' || LOWER(p_search_term) || '%')
    GROUP BY s.id
    ORDER BY s.code;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subjects_with_counts TO authenticated;

-- 4. Create function to get subject groups with all details
CREATE OR REPLACE FUNCTION get_subject_groups_with_details(p_subject_id UUID)
RETURNS TABLE (
    id UUID,
    subject_id UUID,
    semester_id UUID,
    group_code VARCHAR,
    max_students INT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    student_group_id UUID,
    semester_name VARCHAR,
    academic_year_name VARCHAR,
    teacher_count BIGINT,
    teacher_names TEXT,
    assignment_count BIGINT,
    enrolled_students BIGINT,
    has_classroom_assignments BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        sg.id,
        sg.subject_id,
        sg.semester_id,
        sg.group_code,
        sg.max_students,
        sg.created_at,
        sg.updated_at,
        sg.student_group_id,
        sem.name as semester_name,
        ay.name as academic_year_name,
        COUNT(DISTINCT tga.teacher_id) as teacher_count,
        STRING_AGG(DISTINCT CONCAT(t.first_name, ' ', t.last_name), ', ' ORDER BY t.last_name) as teacher_names,
        COUNT(DISTINCT a.id) as assignment_count,
        COUNT(DISTINCT sgs.student_id) as enrolled_students,
        EXISTS(
            SELECT 1 FROM assignments a2 
            JOIN assignment_classrooms ac ON a2.id = ac.assignment_id
            WHERE a2.subject_group_id = sg.id
        ) as has_classroom_assignments
    FROM subject_groups sg
    LEFT JOIN semesters sem ON sg.semester_id = sem.id
    LEFT JOIN academic_years ay ON sem.academic_year_id = ay.id
    LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id AND tga.academic_year = '2025-2026'
    LEFT JOIN teachers t ON tga.teacher_id = t.id
    LEFT JOIN assignments a ON sg.id = a.subject_group_id
    LEFT JOIN subject_group_students sgs ON sg.id = sgs.subject_group_id
    WHERE sg.subject_id = p_subject_id
    GROUP BY sg.id, sem.id, ay.id
    ORDER BY sg.group_code;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subject_groups_with_details TO authenticated;

-- 5. Create optimized function to get assignment details for groups
CREATE OR REPLACE FUNCTION get_group_assignment_details(p_group_ids UUID[])
RETURNS TABLE (
    subject_group_id UUID,
    assignment_id UUID,
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    classroom_name VARCHAR,
    classroom_building VARCHAR,
    is_full_semester BOOLEAN,
    week_numbers INT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        a.subject_group_id,
        a.id as assignment_id,
        ts.day_of_week,
        ts.start_time,
        ts.end_time,
        c.name as classroom_name,
        c.building as classroom_building,
        ac.is_full_semester,
        ARRAY_AGG(DISTINCT acw.week_number ORDER BY acw.week_number) FILTER (WHERE acw.week_number IS NOT NULL) as week_numbers
    FROM assignments a
    JOIN time_slots ts ON a.time_slot_id = ts.id
    JOIN assignment_classrooms ac ON a.id = ac.assignment_id
    JOIN classrooms c ON ac.classroom_id = c.id
    LEFT JOIN assignment_classroom_weeks acw ON ac.id = acw.assignment_classroom_id
    WHERE a.subject_group_id = ANY(p_group_ids)
    GROUP BY a.id, ts.id, c.id, ac.id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_group_assignment_details TO authenticated;

-- 6. Create a summary function for dashboard statistics
CREATE OR REPLACE FUNCTION get_subject_dashboard_stats(p_degree_prefix TEXT DEFAULT NULL)
RETURNS TABLE (
    total_subjects BIGINT,
    total_groups BIGINT,
    total_ects NUMERIC,
    total_teachers BIGINT,
    subjects_without_groups BIGINT,
    groups_without_assignments BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH subject_stats AS (
        SELECT 
            s.id,
            s.credits,
            COUNT(DISTINCT sg.id) as group_count
        FROM subjects s
        LEFT JOIN subject_groups sg ON s.id = sg.subject_id
        WHERE p_degree_prefix IS NULL OR s.code LIKE p_degree_prefix || '%'
        GROUP BY s.id
    ),
    group_stats AS (
        SELECT 
            sg.id,
            COUNT(DISTINCT a.id) as assignment_count
        FROM subject_groups sg
        LEFT JOIN subjects s ON sg.subject_id = s.id
        LEFT JOIN assignments a ON sg.id = a.subject_group_id
        WHERE p_degree_prefix IS NULL OR s.code LIKE p_degree_prefix || '%'
        GROUP BY sg.id
    )
    SELECT 
        COUNT(DISTINCT ss.id) as total_subjects,
        SUM(ss.group_count) as total_groups,
        SUM(ss.credits) as total_ects,
        COUNT(DISTINCT t.id) as total_teachers,
        COUNT(DISTINCT CASE WHEN ss.group_count = 0 THEN ss.id END) as subjects_without_groups,
        COUNT(DISTINCT CASE WHEN gs.assignment_count = 0 THEN gs.id END) as groups_without_assignments
    FROM subject_stats ss
    CROSS JOIN group_stats gs
    LEFT JOIN subject_groups sg ON sg.subject_id = ss.id
    LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id
    LEFT JOIN teachers t ON tga.teacher_id = t.id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subject_dashboard_stats TO authenticated;

-- Comment on functions for documentation
COMMENT ON FUNCTION get_subjects_with_counts IS 'Efficiently retrieve subjects with aggregated counts for groups, teachers, assignments, and capacity';
COMMENT ON FUNCTION get_subject_groups_with_details IS 'Get all groups for a subject with teacher names, assignment counts, and enrollment information';
COMMENT ON FUNCTION get_group_assignment_details IS 'Get assignment details including classrooms and time slots for multiple groups';
COMMENT ON FUNCTION get_subject_dashboard_stats IS 'Get summary statistics for the subjects dashboard';