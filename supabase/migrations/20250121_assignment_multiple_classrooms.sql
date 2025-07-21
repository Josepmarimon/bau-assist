-- Create a junction table for multiple classrooms per assignment
CREATE TABLE assignment_classrooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(assignment_id, classroom_id)
);

-- Create indexes for better performance
CREATE INDEX idx_assignment_classrooms_assignment ON assignment_classrooms(assignment_id);
CREATE INDEX idx_assignment_classrooms_classroom ON assignment_classrooms(classroom_id);

-- Enable RLS
ALTER TABLE assignment_classrooms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access" ON assignment_classrooms 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write access" ON assignment_classrooms 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migrate existing classroom assignments to the new structure
-- Insert existing classroom relationships into the new table
INSERT INTO assignment_classrooms (assignment_id, classroom_id, created_at)
SELECT 
    id as assignment_id,
    classroom_id,
    NOW() as created_at
FROM assignments
WHERE classroom_id IS NOT NULL;

-- Create a view to get assignments with their classrooms as an array
CREATE OR REPLACE VIEW assignments_with_classrooms AS
SELECT 
    a.*,
    COALESCE(
        array_agg(
            json_build_object(
                'id', c.id,
                'code', c.code,
                'name', c.name,
                'capacity', c.capacity,
                'type', c.type,
                'building', c.building
            ) ORDER BY c.code
        ) FILTER (WHERE c.id IS NOT NULL),
        ARRAY[]::json[]
    ) as classrooms
FROM assignments a
LEFT JOIN assignment_classrooms ac ON a.id = ac.assignment_id
LEFT JOIN classrooms c ON ac.classroom_id = c.id
GROUP BY a.id;

-- Grant permissions on the view
GRANT SELECT ON assignments_with_classrooms TO authenticated;

-- Comment the tables
COMMENT ON TABLE assignment_classrooms IS 'Junction table to allow multiple classrooms per assignment';
COMMENT ON COLUMN assignments.classroom_id IS 'DEPRECATED: Use assignment_classrooms table instead. Kept for backwards compatibility.';