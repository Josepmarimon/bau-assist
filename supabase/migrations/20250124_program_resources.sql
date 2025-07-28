-- Program classroom preferences (certain programs prefer specific classrooms)
CREATE TABLE IF NOT EXISTS program_classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 is highest priority
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, classroom_id)
);

-- Program equipment requirements
CREATE TABLE IF NOT EXISTS program_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    min_quantity INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, equipment_type_id)
);

-- Program software requirements (extending existing pattern)
CREATE TABLE IF NOT EXISTS program_software (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    software_id UUID NOT NULL REFERENCES software(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    min_licenses INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, software_id)
);

-- Program scheduling preferences
CREATE TABLE IF NOT EXISTS program_scheduling_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    preferred_shift VARCHAR(20) CHECK (preferred_shift IN ('MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE')),
    min_hours_between_classes INTEGER DEFAULT 0, -- Minimum break between classes
    max_hours_per_day INTEGER DEFAULT 8, -- Maximum daily class hours
    preferred_days JSONB DEFAULT '["1","2","3","4","5"]', -- Array of preferred weekdays
    block_scheduling BOOLEAN DEFAULT false, -- Prefer consecutive hours
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id)
);

-- Migrate data from masters_software to program_software
INSERT INTO program_software (program_id, software_id, is_required)
SELECT 
    p.id as program_id,
    ms.software_id,
    ms.is_required
FROM masters_software ms
JOIN masters_programs mp ON ms.masters_id = mp.id
JOIN programs p ON p.code = mp.code
WHERE NOT EXISTS (
    SELECT 1 FROM program_software ps 
    WHERE ps.program_id = p.id AND ps.software_id = ms.software_id
);

-- Create indexes
CREATE INDEX idx_program_classrooms_program ON program_classrooms(program_id);
CREATE INDEX idx_program_classrooms_classroom ON program_classrooms(classroom_id);
CREATE INDEX idx_program_equipment_program ON program_equipment(program_id);
CREATE INDEX idx_program_equipment_type ON program_equipment(equipment_type_id);
CREATE INDEX idx_program_software_program ON program_software(program_id);
CREATE INDEX idx_program_software_software ON program_software(software_id);
CREATE INDEX idx_program_scheduling_program ON program_scheduling_preferences(program_id);

-- Enable RLS
ALTER TABLE program_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_scheduling_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read for all authenticated, write for admins)
-- Program classrooms
CREATE POLICY "Users can view program classrooms" ON program_classrooms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage program classrooms" ON program_classrooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Program equipment
CREATE POLICY "Users can view program equipment" ON program_equipment
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage program equipment" ON program_equipment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Program software
CREATE POLICY "Users can view program software" ON program_software
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage program software" ON program_software
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Program scheduling preferences
CREATE POLICY "Users can view program scheduling preferences" ON program_scheduling_preferences
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage program scheduling preferences" ON program_scheduling_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create trigger for scheduling preferences
CREATE TRIGGER update_program_scheduling_preferences_updated_at
    BEFORE UPDATE ON program_scheduling_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for program resource summary
CREATE OR REPLACE VIEW program_resource_summary AS
SELECT 
    p.id as program_id,
    p.code as program_code,
    p.name as program_name,
    p.type as program_type,
    COUNT(DISTINCT pc.classroom_id) as preferred_classrooms,
    COUNT(DISTINCT pe.equipment_type_id) as required_equipment_types,
    COUNT(DISTINCT ps.software_id) as required_software,
    psp.preferred_shift,
    psp.block_scheduling
FROM programs p
LEFT JOIN program_classrooms pc ON p.id = pc.program_id
LEFT JOIN program_equipment pe ON p.id = pe.program_id
LEFT JOIN program_software ps ON p.id = ps.program_id
LEFT JOIN program_scheduling_preferences psp ON p.id = psp.program_id
WHERE p.active = true
GROUP BY p.id, psp.preferred_shift, psp.block_scheduling;

-- Grant permissions
GRANT SELECT ON program_resource_summary TO authenticated;

-- Add comments
COMMENT ON TABLE program_classrooms IS 'Preferred classrooms for each program';
COMMENT ON TABLE program_equipment IS 'Equipment requirements for each program';
COMMENT ON TABLE program_software IS 'Software requirements for each program';
COMMENT ON TABLE program_scheduling_preferences IS 'Scheduling preferences and constraints for each program';
COMMENT ON COLUMN program_scheduling_preferences.preferred_shift IS 'Preferred time of day: MORNING, AFTERNOON, EVENING, FLEXIBLE';
COMMENT ON COLUMN program_scheduling_preferences.block_scheduling IS 'Whether to prefer consecutive hours for classes';