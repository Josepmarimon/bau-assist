-- Update subjects table to support programs
-- First, remove the old year constraint to allow more flexibility
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_year_check;

-- Add new columns for program support
ALTER TABLE subjects 
    ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS term_type TEXT DEFAULT 'semester' CHECK (term_type IN ('semester', 'trimester', 'quarter')),
    ADD COLUMN IF NOT EXISTS term_number INTEGER CHECK (term_number >= 1 AND term_number <= 4);

-- Add a more flexible year constraint that works for all program types
ALTER TABLE subjects 
    ADD CONSTRAINT subjects_year_check CHECK (year >= 1 AND year <= 10);

-- Create index for program queries
CREATE INDEX IF NOT EXISTS idx_subjects_program ON subjects(program_id);

-- Create program_software table for software requirements by program
CREATE TABLE program_software (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    software_id UUID NOT NULL REFERENCES software(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, software_id)
);

-- Add indexes
CREATE INDEX idx_program_software_program ON program_software(program_id);
CREATE INDEX idx_program_software_software ON program_software(software_id);

-- Enable RLS
ALTER TABLE program_software ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Program software are viewable by authenticated users" ON program_software
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program software are manageable by authenticated users" ON program_software
    FOR ALL USING (auth.role() = 'authenticated');

-- Migrate existing masters_software relationships to program_software
INSERT INTO program_software (program_id, software_id, is_required)
SELECT 
    p.id as program_id,
    ms.software_id,
    ms.is_required
FROM masters_software ms
JOIN masters_programs mp ON ms.master_id = mp.id
JOIN programs p ON p.code = mp.code AND p.type = 'master'
ON CONFLICT (program_id, software_id) DO NOTHING;

-- Create a view to simplify program management
CREATE OR REPLACE VIEW program_overview AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.type,
    p.duration_years,
    p.credits,
    p.coordinator_name,
    p.coordinator_email,
    p.active,
    COUNT(DISTINCT ps.subject_id) as subject_count,
    COUNT(DISTINCT psoft.software_id) as software_count,
    COUNT(DISTINCT peq.equipment_type_id) as equipment_count,
    COUNT(DISTINCT pc.classroom_id) as preferred_classroom_count
FROM programs p
LEFT JOIN program_subjects ps ON p.id = ps.program_id
LEFT JOIN program_software psoft ON p.id = psoft.program_id
LEFT JOIN program_equipment peq ON p.id = peq.program_id
LEFT JOIN program_classrooms pc ON p.id = pc.program_id
GROUP BY p.id, p.code, p.name, p.type, p.duration_years, p.credits, 
         p.coordinator_name, p.coordinator_email, p.active;

-- Grant permissions on the view
GRANT SELECT ON program_overview TO authenticated;