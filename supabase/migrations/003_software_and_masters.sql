-- Create software table
CREATE TABLE IF NOT EXISTS software (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    operating_systems JSONB DEFAULT '[]',
    version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create masters programs table
CREATE TABLE IF NOT EXISTS masters_programs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    coordinator_name VARCHAR(100),
    coordinator_email VARCHAR(100),
    duration_months INTEGER,
    credits INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create software requirements table for subjects
CREATE TABLE IF NOT EXISTS subject_software (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    software_id UUID REFERENCES software(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, software_id)
);

-- Create software requirements table for masters
CREATE TABLE IF NOT EXISTS masters_software (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    masters_id UUID REFERENCES masters_programs(id) ON DELETE CASCADE,
    software_id UUID REFERENCES software(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(masters_id, software_id)
);

-- Create indexes
CREATE INDEX idx_software_category ON software(category);
CREATE INDEX idx_software_license ON software(license_type);
CREATE INDEX idx_subject_software_subject ON subject_software(subject_id);
CREATE INDEX idx_subject_software_software ON subject_software(software_id);
CREATE INDEX idx_masters_software_masters ON masters_software(masters_id);
CREATE INDEX idx_masters_software_software ON masters_software(software_id);

-- Enable RLS
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters_software ENABLE ROW LEVEL SECURITY;

-- Policies for viewing (all authenticated users)
CREATE POLICY "Users can view software" ON software
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view masters programs" ON masters_programs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view subject software requirements" ON subject_software
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view masters software requirements" ON masters_software
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for managing (only admins)
CREATE POLICY "Admins can manage software" ON software
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage masters programs" ON masters_programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage subject software requirements" ON subject_software
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage masters software requirements" ON masters_software
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_software_updated_at
    BEFORE UPDATE ON software
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_masters_programs_updated_at
    BEFORE UPDATE ON masters_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();