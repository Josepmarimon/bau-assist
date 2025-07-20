-- Remove group_type column from subject_groups table
ALTER TABLE subject_groups 
DROP COLUMN IF EXISTS group_type;

-- Update any views that might reference this column
-- No views found that use this column based on the codebase search