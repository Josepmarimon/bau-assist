-- Remove the year constraint to allow flexible values for masters/postgraus
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_year_check;

-- Add program_level to distinguish between different academic levels
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS program_level VARCHAR(20) DEFAULT 'grau';

-- Add flexible semester system (some masters have trimesters)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS term_type VARCHAR(20) DEFAULT 'semester';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS term_number INTEGER;

-- Update existing subjects to have proper program level
UPDATE subjects 
SET program_level = 'grau',
    term_type = 'semester'
WHERE program_level IS NULL;

-- Add new subject types for masters/postgraus
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_type_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_type_check 
    CHECK (type IN ('OBLIGATORIA', 'OPTATIVA', 'TFG', 'TFM', 'PRACTIQUES', 'SEMINARI'));

-- Create a view to easily query subjects by program
CREATE OR REPLACE VIEW subjects_by_program AS
SELECT 
    p.id as program_id,
    p.code as program_code,
    p.name as program_name,
    p.type as program_type,
    s.*,
    ps.year as program_year,
    ps.semester as program_semester,
    ps.is_mandatory,
    ps.specialization
FROM programs p
JOIN program_subjects ps ON p.id = ps.program_id
JOIN subjects s ON ps.subject_id = s.id
WHERE p.active = true;

-- Grant permissions
GRANT SELECT ON subjects_by_program TO authenticated;

-- Add comments
COMMENT ON COLUMN subjects.program_level IS 'Academic level: grau, master, postgrau';
COMMENT ON COLUMN subjects.term_type IS 'Type of academic term: semester, trimester, quarter';
COMMENT ON COLUMN subjects.term_number IS 'Which term within the academic year';