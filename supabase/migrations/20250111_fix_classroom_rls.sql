-- Fix RLS policies for classrooms table to allow read access

-- Drop existing policies if any
DROP POLICY IF EXISTS "classrooms_read_policy" ON classrooms;
DROP POLICY IF EXISTS "classrooms_write_policy" ON classrooms;
DROP POLICY IF EXISTS "Enable read access for all users" ON classrooms;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON classrooms;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON classrooms;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON classrooms;

-- Enable RLS on classrooms table
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- Create policies for classrooms
CREATE POLICY "Enable read access for all users" ON classrooms
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON classrooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON classrooms
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON classrooms
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure proper access for related tables
-- schedule_slot_classrooms
ALTER TABLE schedule_slot_classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON schedule_slot_classrooms;
CREATE POLICY "Enable read access for all users" ON schedule_slot_classrooms
    FOR SELECT USING (true);

-- schedule_slots
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON schedule_slots;
CREATE POLICY "Enable read access for all users" ON schedule_slots
    FOR SELECT USING (true);

-- subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON subjects;
CREATE POLICY "Enable read access for all users" ON subjects
    FOR SELECT USING (true);

-- student_groups
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON student_groups;
CREATE POLICY "Enable read access for all users" ON student_groups
    FOR SELECT USING (true);

-- teachers
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON teachers;
CREATE POLICY "Enable read access for all users" ON teachers
    FOR SELECT USING (true);

-- schedule_slot_teachers
ALTER TABLE schedule_slot_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON schedule_slot_teachers;
CREATE POLICY "Enable read access for all users" ON schedule_slot_teachers
    FOR SELECT USING (true);