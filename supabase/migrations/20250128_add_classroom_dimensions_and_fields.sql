-- Add width, depth, photos, is_public, and description fields to classrooms table

-- Add width field (in meters)
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS width DECIMAL(5,2);

-- Add depth field (in meters)
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS depth DECIMAL(5,2);

-- Add photos field (JSONB array)
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Add is_public field
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add description field
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN classrooms.width IS 'Width of the classroom in meters';
COMMENT ON COLUMN classrooms.depth IS 'Depth of the classroom in meters';
COMMENT ON COLUMN classrooms.photos IS 'Array of photo objects with url, caption, and uploaded_at fields';
COMMENT ON COLUMN classrooms.is_public IS 'Whether this classroom is visible in the public directory';
COMMENT ON COLUMN classrooms.description IS 'Public description of the classroom, its characteristics and recommended uses';