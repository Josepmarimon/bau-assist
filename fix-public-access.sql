-- Script to enable public read access for public pages
-- Execute this in Supabase SQL Editor

-- First, check and drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable public read access for classroom_software_requirements" ON classroom_software_requirements;
    DROP POLICY IF EXISTS "Enable public read access for classrooms" ON classrooms;
    DROP POLICY IF EXISTS "Enable public read access for software" ON software;
    DROP POLICY IF EXISTS "Enable public read access for software_classrooms" ON software_classrooms;
    DROP POLICY IF EXISTS "Enable public read access for course_colors" ON course_colors;
    DROP POLICY IF EXISTS "Enable public read access for assignments" ON assignments;
    DROP POLICY IF EXISTS "Enable public read access for subjects" ON subjects;
    DROP POLICY IF EXISTS "Enable public read access for teachers" ON teachers;
    DROP POLICY IF EXISTS "Enable public read access for time_slots" ON time_slots;
    DROP POLICY IF EXISTS "Enable public read access for student_groups" ON student_groups;
    DROP POLICY IF EXISTS "Enable public read access for semesters" ON semesters;
    DROP POLICY IF EXISTS "Enable public read access for assignment_classrooms" ON assignment_classrooms;
    DROP POLICY IF EXISTS "Enable public read access for classroom_equipment" ON classroom_equipment;
    DROP POLICY IF EXISTS "Enable public read access for equipment_types" ON equipment_types;
END $$;

-- Enable RLS on tables if not already enabled
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- Create public read policies
CREATE POLICY "Enable public read access for classrooms" 
ON classrooms FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for software" 
ON software FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for software_classrooms" 
ON software_classrooms FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for course_colors" 
ON course_colors FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for assignments" 
ON assignments FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for subjects" 
ON subjects FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for teachers" 
ON teachers FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for time_slots" 
ON time_slots FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for student_groups" 
ON student_groups FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for semesters" 
ON semesters FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for assignment_classrooms" 
ON assignment_classrooms FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for classroom_equipment" 
ON classroom_equipment FOR SELECT 
USING (true);

CREATE POLICY "Enable public read access for equipment_types" 
ON equipment_types FOR SELECT 
USING (true);

-- Note: Views inherit RLS from their underlying tables, so we don't need to set policies on views