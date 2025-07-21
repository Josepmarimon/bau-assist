-- Drop the existing foreign key constraint on student_group_id
ALTER TABLE subject_group_profile_members
DROP CONSTRAINT IF EXISTS subject_group_profile_members_student_group_id_fkey;

-- Rename the column from student_group_id to subject_group_id
ALTER TABLE subject_group_profile_members
RENAME COLUMN student_group_id TO subject_group_id;

-- Add the new foreign key constraint to subject_groups
ALTER TABLE subject_group_profile_members
ADD CONSTRAINT subject_group_profile_members_subject_group_id_fkey
FOREIGN KEY (subject_group_id) REFERENCES subject_groups(id) ON DELETE CASCADE;

-- Update the unique constraint
ALTER TABLE subject_group_profile_members
DROP CONSTRAINT IF EXISTS subject_group_profile_members_profile_id_student_group_id_key;

ALTER TABLE subject_group_profile_members
ADD CONSTRAINT subject_group_profile_members_profile_id_subject_group_id_key
UNIQUE (profile_id, subject_group_id);