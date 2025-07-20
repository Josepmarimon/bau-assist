-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Academic years table
CREATE TABLE academic_years (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semesters table
CREATE TABLE semesters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    number INTEGER NOT NULL CHECK (number IN (1, 2)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(academic_year_id, number)
);

-- Subjects table
CREATE TABLE subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    credits INTEGER NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    type VARCHAR(50) NOT NULL CHECK (type IN ('obligatoria', 'optativa', 'tfg')),
    department VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE classrooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(50),
    floor INTEGER,
    capacity INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('teoria', 'taller', 'informatica', 'polivalent')),
    equipment JSONB DEFAULT '[]',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers table
CREATE TABLE teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    department VARCHAR(100),
    contract_type VARCHAR(50),
    max_hours INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time slots table
CREATE TABLE time_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('mati', 'tarda')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(day_of_week, start_time, end_time)
);

-- Student groups table
CREATE TABLE student_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('mati', 'tarda')),
    max_students INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subject groups (theory/practice groups for each subject)
CREATE TABLE subject_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('teoria', 'practica', 'seminari')),
    group_code VARCHAR(20) NOT NULL,
    max_students INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, semester_id, group_code)
);

-- Assignments table (main table for scheduling)
CREATE TABLE assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_group_id UUID NOT NULL REFERENCES subject_groups(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    student_group_id UUID REFERENCES student_groups(id) ON DELETE SET NULL,
    hours_per_week INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(semester_id, classroom_id, time_slot_id, student_group_id)
);

-- Subject requirements table
CREATE TABLE subject_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflicts/overlaps detection table
CREATE TABLE scheduling_conflicts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'error')),
    assignment1_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    assignment2_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_assignments_semester ON assignments(semester_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX idx_assignments_time_slot ON assignments(time_slot_id);
CREATE INDEX idx_conflicts_semester ON scheduling_conflicts(semester_id);
CREATE INDEX idx_conflicts_unresolved ON scheduling_conflicts(resolved) WHERE resolved = false;

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_groups_updated_at BEFORE UPDATE ON student_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_groups_updated_at BEFORE UPDATE ON subject_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_requirements_updated_at BEFORE UPDATE ON subject_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your needs)
-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read access" ON academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON semesters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON time_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON student_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON subject_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON subject_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON scheduling_conflicts FOR SELECT TO authenticated USING (true);

-- Only allow admins to insert/update/delete (you'll need to implement role management)
-- For now, allow authenticated users to manage data
CREATE POLICY "Allow authenticated write access" ON academic_years FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON semesters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON classrooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON time_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON student_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON subject_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON subject_requirements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON scheduling_conflicts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write access" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);