-- Add semester field to subjects table
ALTER TABLE subjects 
ADD COLUMN semester VARCHAR(50) DEFAULT '1r i 2n' CHECK (semester IN ('1r', '2n', '1r i 2n', 'Anual'));

-- Add active field to track subject status
ALTER TABLE subjects 
ADD COLUMN active BOOLEAN DEFAULT true;

-- Update existing subjects based on their code patterns
-- Subjects ending in 001-050 are typically 1st semester
-- Subjects ending in 051-100 are typically 2nd semester
UPDATE subjects 
SET semester = CASE 
    WHEN SUBSTRING(code FROM '[0-9]+$')::INTEGER <= 50 THEN '1r'
    WHEN SUBSTRING(code FROM '[0-9]+$')::INTEGER > 50 THEN '2n'
    ELSE '1r i 2n'
END
WHERE semester IS NULL OR semester = '1r i 2n';

-- Create index for better performance
CREATE INDEX idx_subjects_semester ON subjects(semester);
CREATE INDEX idx_subjects_active ON subjects(active);

-- Add comment for documentation
COMMENT ON COLUMN subjects.semester IS 'Semester when the subject is taught: 1r (first), 2n (second), 1r i 2n (both), Anual (annual)';
COMMENT ON COLUMN subjects.active IS 'Whether the subject is currently active in the curriculum';