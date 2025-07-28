-- Create program types enum
CREATE TYPE program_type AS ENUM ('grau', 'master', 'postgrau');

-- Create programs table to unify all academic programs
CREATE TABLE programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type program_type NOT NULL,
    duration_years INTEGER,
    credits INTEGER,
    coordinator_name TEXT,
    coordinator_email TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for common queries
CREATE INDEX idx_programs_type ON programs(type);
CREATE INDEX idx_programs_active ON programs(active);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS policies for programs
CREATE POLICY "Programs are viewable by authenticated users" ON programs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Programs are manageable by authenticated users" ON programs
    FOR ALL USING (auth.role() = 'authenticated');

-- Create program_subjects junction table
CREATE TABLE program_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    year INTEGER CHECK (year >= 1 AND year <= 10), -- Flexible for different program types
    semester INTEGER CHECK (semester IN (1, 2, 3)), -- Allow trimester programs
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, subject_id)
);

-- Add indexes for performance
CREATE INDEX idx_program_subjects_program ON program_subjects(program_id);
CREATE INDEX idx_program_subjects_subject ON program_subjects(subject_id);

-- Enable RLS
ALTER TABLE program_subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Program subjects are viewable by authenticated users" ON program_subjects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program subjects are manageable by authenticated users" ON program_subjects
    FOR ALL USING (auth.role() = 'authenticated');

-- Create program_classrooms table for preferred classrooms
CREATE TABLE program_classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, classroom_id)
);

-- Add indexes
CREATE INDEX idx_program_classrooms_program ON program_classrooms(program_id);
CREATE INDEX idx_program_classrooms_classroom ON program_classrooms(classroom_id);

-- Enable RLS
ALTER TABLE program_classrooms ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Program classrooms are viewable by authenticated users" ON program_classrooms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program classrooms are manageable by authenticated users" ON program_classrooms
    FOR ALL USING (auth.role() = 'authenticated');

-- Migrate existing masters_programs data to the new programs table
INSERT INTO programs (code, name, type, duration_years, credits, coordinator_name, coordinator_email, active)
SELECT 
    code,
    name,
    'master'::program_type,
    duration_years,
    credits,
    coordinator_name,
    coordinator_email,
    true
FROM masters_programs
ON CONFLICT (code) DO NOTHING;

-- Migrate existing graus (degrees) to programs table
INSERT INTO programs (code, name, type, active)
SELECT 
    code,
    name,
    'grau'::program_type,
    true
FROM graus
ON CONFLICT (code) DO NOTHING;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();