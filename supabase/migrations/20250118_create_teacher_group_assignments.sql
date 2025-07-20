-- Create a new table to store direct teacher-to-group assignments
CREATE TABLE IF NOT EXISTS teacher_group_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    subject_group_id UUID REFERENCES subject_groups(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    ects_assigned DECIMAL(4,2),
    is_coordinator BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate assignments
    UNIQUE(teacher_id, subject_group_id, academic_year)
);

-- Create indexes for performance
CREATE INDEX idx_teacher_group_assignments_teacher ON teacher_group_assignments(teacher_id);
CREATE INDEX idx_teacher_group_assignments_group ON teacher_group_assignments(subject_group_id);
CREATE INDEX idx_teacher_group_assignments_year ON teacher_group_assignments(academic_year);

-- Enable RLS
ALTER TABLE teacher_group_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for viewing (all authenticated users)
CREATE POLICY "Users can view teacher group assignments" ON teacher_group_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for managing (admins only)
CREATE POLICY "Admins can manage teacher group assignments" ON teacher_group_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_group_assignments_updated_at
    BEFORE UPDATE ON teacher_group_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE teacher_group_assignments IS 'Direct assignments of teachers to specific subject groups';