-- Create teaching assignments table
CREATE TABLE IF NOT EXISTS teaching_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    student_group_id UUID REFERENCES student_groups(id) ON DELETE SET NULL,
    ects_assigned DECIMAL(4,2) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER CHECK (semester IN (1, 2)),
    is_coordinator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_teaching_assignments_subject ON teaching_assignments(subject_id);
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_group ON teaching_assignments(student_group_id);
CREATE INDEX idx_teaching_assignments_year ON teaching_assignments(academic_year);

-- Create RLS policies
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for viewing assignments (all authenticated users can view)
CREATE POLICY "Users can view teaching assignments" ON teaching_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for creating/updating/deleting assignments (only admins)
CREATE POLICY "Admins can manage teaching assignments" ON teaching_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Create trigger to update updated_at
CREATE TRIGGER update_teaching_assignments_updated_at
    BEFORE UPDATE ON teaching_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();