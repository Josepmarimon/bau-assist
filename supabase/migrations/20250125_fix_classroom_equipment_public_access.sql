-- Fix RLS policies for classroom_equipment to allow public access

-- Drop the existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Classroom equipment are viewable by authenticated users" ON classroom_equipment;

-- Create a new policy that allows public access for reading
CREATE POLICY "Classroom equipment are viewable by everyone" ON classroom_equipment
    FOR SELECT USING (true);

-- Keep the other policies for authenticated users only
-- (The existing policies for INSERT, UPDATE, DELETE remain unchanged)

-- Also update equipment_types to allow public access
DROP POLICY IF EXISTS "Equipment types are viewable by authenticated users" ON equipment_types;

CREATE POLICY "Equipment types are viewable by everyone" ON equipment_types
    FOR SELECT USING (true);