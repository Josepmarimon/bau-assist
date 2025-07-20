-- Add itinerari column to subjects table
ALTER TABLE subjects 
ADD COLUMN itinerari text;

-- Add comment for documentation
COMMENT ON COLUMN subjects.itinerari IS 'Track or pathway for the subject (e.g., "Videojocs", "Animació", etc.)';

-- Update existing records with a default value if needed
-- You can modify this based on your specific requirements
UPDATE subjects 
SET itinerari = NULL 
WHERE itinerari IS NULL;