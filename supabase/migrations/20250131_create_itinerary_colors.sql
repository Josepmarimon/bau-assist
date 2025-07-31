-- Create table for design itineraries
CREATE TABLE IF NOT EXISTS design_itineraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert design itineraries with their colors
INSERT INTO design_itineraries (name, code, color, description) VALUES
('Disseny de Moda', 'MODA', '#EF4444', 'Itinerari de disseny de moda i tèxtil'),
('Disseny d''Interiors', 'INTERIORS', '#EAB308', 'Itinerari de disseny d''espais i interiors'),
('Disseny Gràfic', 'GRAFIC', '#06B6D4', 'Itinerari de disseny gràfic i comunicació visual'),
('Disseny Audiovisual', 'AUDIOVISUAL', '#8B5CF6', 'Itinerari de disseny audiovisual i multimèdia')
ON CONFLICT (code) DO NOTHING;

-- Update course_colors table to handle both course-year and itinerary colors
ALTER TABLE course_colors 
ADD COLUMN IF NOT EXISTS color_type VARCHAR(20) DEFAULT 'course',
ADD COLUMN IF NOT EXISTS itinerary_code VARCHAR(50);

-- Add check constraint
ALTER TABLE course_colors
ADD CONSTRAINT course_colors_type_check 
CHECK (
    (color_type = 'course' AND itinerary_code IS NULL) OR 
    (color_type = 'itinerary' AND itinerary_code IS NOT NULL)
);

-- Update existing records to be of type 'course'
UPDATE course_colors SET color_type = 'course' WHERE color_type IS NULL;

-- Update unique constraint to include color_type and itinerary_code
ALTER TABLE course_colors DROP CONSTRAINT IF EXISTS course_colors_course_code_year_key;
ALTER TABLE course_colors 
ADD CONSTRAINT course_colors_unique_key 
UNIQUE (course_code, year, color_type, itinerary_code);

-- Keep colors for 1st and 2nd year of Design
DELETE FROM course_colors 
WHERE course_code = 'GD' AND year IN (3, 4);

-- Add itinerary colors for 3rd and 4th year Design subjects
INSERT INTO course_colors (course_name, course_code, year, color, color_type, itinerary_code)
SELECT 
    'Grau en Disseny - ' || di.name || ' - 3r',
    'GD',
    3,
    di.color,
    'itinerary',
    di.code
FROM design_itineraries di
UNION ALL
SELECT 
    'Grau en Disseny - ' || di.name || ' - 4t',
    'GD',
    4,
    di.color,
    'itinerary',
    di.code
FROM design_itineraries di
ON CONFLICT DO NOTHING;

-- Add RLS policies for design_itineraries
ALTER TABLE design_itineraries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "design_itineraries_read" ON design_itineraries
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admins to update
CREATE POLICY "design_itineraries_update" ON design_itineraries
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_design_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_design_itineraries_updated_at
    BEFORE UPDATE ON design_itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_design_itineraries_updated_at();

-- Add comments
COMMENT ON TABLE design_itineraries IS 'Design specialization itineraries for 3rd and 4th year';
COMMENT ON COLUMN design_itineraries.code IS 'Short code to identify the itinerary';
COMMENT ON COLUMN course_colors.color_type IS 'Type of color assignment: course (by year) or itinerary (by specialization)';
COMMENT ON COLUMN course_colors.itinerary_code IS 'Reference to design_itineraries.code for itinerary-based colors';