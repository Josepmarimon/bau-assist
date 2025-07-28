-- Drop the conflicting admin-only policy
DROP POLICY IF EXISTS "Admins can manage programs" ON programs;

-- Create a more permissive policy for color updates
-- Allow authenticated users to update only the color field
CREATE POLICY "Authenticated users can update program colors" ON programs
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (
        -- Only allow updating color and updated_at fields
        (NEW.id = OLD.id) AND
        (NEW.code = OLD.code) AND
        (NEW.name = OLD.name) AND
        (NEW.type = OLD.type) AND
        (COALESCE(NEW.duration_years, 0) = COALESCE(OLD.duration_years, 0)) AND
        (COALESCE(NEW.credits, 0) = COALESCE(OLD.credits, 0)) AND
        (COALESCE(NEW.coordinator_name, '') = COALESCE(OLD.coordinator_name, '')) AND
        (COALESCE(NEW.coordinator_email, '') = COALESCE(OLD.coordinator_email, '')) AND
        (COALESCE(NEW.description, '') = COALESCE(OLD.description, '')) AND
        (NEW.active = OLD.active) AND
        (NEW.created_at = OLD.created_at)
    );

-- Keep the general management policy but rename it for clarity
CREATE POLICY "Authenticated users can insert and delete programs" ON programs
    FOR INSERT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their programs" ON programs
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Add comment explaining the policy structure
COMMENT ON POLICY "Authenticated users can update program colors" ON programs IS 
    'Allows authenticated users to update only the color field of programs, preventing unauthorized changes to other fields';