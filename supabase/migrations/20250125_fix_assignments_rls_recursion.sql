-- Fix RLS recursion issue for assignments table
-- This migration removes problematic references to user_profiles

-- First, check if created_by has a foreign key constraint to user_profiles
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_created_by_fkey;

-- If the created_by column references auth.users instead, that's fine
-- But if it references user_profiles, we need to remove it

-- Temporarily disable RLS to make changes
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

-- Drop and recreate policies without user_profiles references
DROP POLICY IF EXISTS "Allow authenticated read access" ON assignments;
DROP POLICY IF EXISTS "Allow authenticated write access" ON assignments;

-- Create new, simpler policies
CREATE POLICY "Enable read access for authenticated users" 
ON assignments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON assignments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON assignments FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
ON assignments FOR DELETE 
TO authenticated 
USING (true);

-- Re-enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Make created_by nullable and remove any default that might reference user_profiles
ALTER TABLE assignments 
ALTER COLUMN created_by DROP DEFAULT,
ALTER COLUMN created_by DROP NOT NULL;

-- Add a comment explaining the issue
COMMENT ON COLUMN assignments.created_by IS 
'User who created this assignment. Nullable to avoid RLS recursion issues with user_profiles.';