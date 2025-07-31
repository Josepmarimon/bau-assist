-- Create a configuration table for course colors
CREATE TABLE IF NOT EXISTS course_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL UNIQUE,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups
CREATE INDEX idx_course_colors_code_year ON course_colors(course_code, year);

-- Insert default colors for existing courses
INSERT INTO course_colors (course_name, course_code, year, color) VALUES
-- Grau en Disseny - Different colors per year
('Grau en Disseny - 1r', 'GD', 1, '#012853'),  -- Dark blue (current color)
('Grau en Disseny - 2n', 'GD', 2, '#1E40AF'),  -- Medium blue
('Grau en Disseny - 3r', 'GD', 3, '#2563EB'),  -- Bright blue
('Grau en Disseny - 4t', 'GD', 4, '#3B82F6'),  -- Light blue

-- Grau en Belles Arts - Different shades of green
('Grau en Belles Arts - 1r', 'GBA', 1, '#14532D'), -- Dark green
('Grau en Belles Arts - 2n', 'GBA', 2, '#166534'),  -- Medium green
('Grau en Belles Arts - 3r', 'GBA', 3, '#16A34A'),  -- Bright green
('Grau en Belles Arts - 4t', 'GBA', 4, '#22C55E')   -- Light green
ON CONFLICT (course_code, year) DO NOTHING;

-- Add RLS policies
ALTER TABLE course_colors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "course_colors_read" ON course_colors
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admins to update
CREATE POLICY "course_colors_update" ON course_colors
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
CREATE OR REPLACE FUNCTION update_course_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_course_colors_updated_at
    BEFORE UPDATE ON course_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_course_colors_updated_at();

-- Add comments
COMMENT ON TABLE course_colors IS 'Configuration table for course colors by year';
COMMENT ON COLUMN course_colors.course_name IS 'Full name of the course and year';
COMMENT ON COLUMN course_colors.course_code IS 'Short code for the course (GD, GBA, etc.)';
COMMENT ON COLUMN course_colors.year IS 'Academic year (1-4)';
COMMENT ON COLUMN course_colors.color IS 'Hex color code for visual representation';