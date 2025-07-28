-- Create program types enum
CREATE TYPE program_type AS ENUM ('grau', 'master', 'postgrau');

-- Create programs table (comprehensive program management)
CREATE TABLE IF NOT EXISTS programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type program_type NOT NULL,
    credits INTEGER NOT NULL,
    duration_years DECIMAL(2,1), -- Allows 1.5 years for masters
    coordinator_name VARCHAR(100),
    coordinator_email VARCHAR(100),
    department VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create program_subjects junction table
CREATE TABLE IF NOT EXISTS program_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, -- Can be 1-4 for grau, 1-2 for masters
    semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3)), -- 3 for annual subjects
    is_mandatory BOOLEAN DEFAULT true,
    specialization VARCHAR(100), -- For optional specialization tracks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, subject_id)
);

-- Migrate existing graus data to programs
INSERT INTO programs (code, name, type, credits, duration_years, active)
SELECT 
    codi as code,
    nom as name,
    'grau'::program_type as type,
    240 as credits, -- Standard for 4-year degrees
    4 as duration_years,
    true as active
FROM graus
WHERE NOT EXISTS (
    SELECT 1 FROM programs p WHERE p.code = graus.codi
);

-- Migrate existing masters_programs data to programs
INSERT INTO programs (code, name, type, credits, duration_years, coordinator_name, coordinator_email, active)
SELECT 
    code,
    name,
    'master'::program_type as type,
    credits,
    CASE 
        WHEN duration_months IS NOT NULL THEN duration_months::decimal / 12
        ELSE 1.5 -- Default master duration
    END as duration_years,
    coordinator_name,
    coordinator_email,
    true as active
FROM masters_programs
WHERE NOT EXISTS (
    SELECT 1 FROM programs p WHERE p.code = masters_programs.code
);

-- Create indexes
CREATE INDEX idx_programs_type ON programs(type);
CREATE INDEX idx_programs_active ON programs(active);
CREATE INDEX idx_program_subjects_program ON program_subjects(program_id);
CREATE INDEX idx_program_subjects_subject ON program_subjects(subject_id);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programs
CREATE POLICY "Users can view programs" ON programs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage programs" ON programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for program_subjects
CREATE POLICY "Users can view program subjects" ON program_subjects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage program subjects" ON program_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE programs IS 'Unified table for all academic programs (graus, masters, postgraus)';
COMMENT ON COLUMN programs.type IS 'Type of program: grau (undergraduate), master, or postgrau';
COMMENT ON COLUMN programs.duration_years IS 'Duration in years, supports decimals for 1.5 year programs';
COMMENT ON TABLE program_subjects IS 'Links subjects to their respective programs with year and semester info';
COMMENT ON COLUMN program_subjects.specialization IS 'Optional specialization track within the program';