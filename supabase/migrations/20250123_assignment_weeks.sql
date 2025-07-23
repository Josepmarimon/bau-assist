-- Add support for week-specific classroom assignments

-- First, add columns to assignment_classrooms table
ALTER TABLE assignment_classrooms 
ADD COLUMN is_full_semester BOOLEAN DEFAULT true,
ADD COLUMN week_range_type VARCHAR(20) DEFAULT 'full' CHECK (week_range_type IN ('full', 'specific_weeks'));

-- Create table for specific weeks assignment
CREATE TABLE assignment_classroom_weeks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_classroom_id UUID NOT NULL REFERENCES assignment_classrooms(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 15),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(assignment_classroom_id, week_number)
);

-- Create indexes for better performance
CREATE INDEX idx_assignment_classroom_weeks_assignment ON assignment_classroom_weeks(assignment_classroom_id);
CREATE INDEX idx_assignment_classroom_weeks_week ON assignment_classroom_weeks(week_number);

-- Enable RLS
ALTER TABLE assignment_classroom_weeks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access" ON assignment_classroom_weeks 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write access" ON assignment_classroom_weeks 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update the assignments_with_classrooms view to include week information
CREATE OR REPLACE VIEW assignments_with_classrooms AS
SELECT 
    a.*,
    COALESCE(
        array_agg(
            DISTINCT jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'name', c.name,
                'capacity', c.capacity,
                'type', c.type,
                'building', c.building,
                'is_full_semester', ac.is_full_semester,
                'week_range_type', ac.week_range_type,
                'weeks', COALESCE(
                    (SELECT array_agg(acw.week_number ORDER BY acw.week_number)
                     FROM assignment_classroom_weeks acw 
                     WHERE acw.assignment_classroom_id = ac.id),
                    ARRAY[]::integer[]
                )
            ) ORDER BY c.code
        ) FILTER (WHERE c.id IS NOT NULL),
        ARRAY[]::jsonb[]
    ) as classrooms
FROM assignments a
LEFT JOIN assignment_classrooms ac ON a.id = ac.assignment_id
LEFT JOIN classrooms c ON ac.classroom_id = c.id
GROUP BY a.id;

-- Grant permissions on the view
GRANT SELECT ON assignments_with_classrooms TO authenticated;

-- Function to check classroom conflicts considering weeks
CREATE OR REPLACE FUNCTION check_classroom_week_conflicts(
    p_classroom_id UUID,
    p_time_slot_id UUID,
    p_week_numbers INTEGER[],
    p_exclude_assignment_id UUID DEFAULT NULL
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

-- Comment the tables
COMMENT ON TABLE assignment_classroom_weeks IS 'Stores specific weeks for non-full-semester classroom assignments';
COMMENT ON COLUMN assignment_classrooms.is_full_semester IS 'Indicates if the classroom is assigned for the entire semester';
COMMENT ON COLUMN assignment_classrooms.week_range_type IS 'Type of week assignment: full semester or specific weeks';