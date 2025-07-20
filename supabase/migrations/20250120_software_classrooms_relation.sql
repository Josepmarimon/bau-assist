-- Create a junction table for software-classroom relationships
CREATE TABLE IF NOT EXISTS software_classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  software_id UUID NOT NULL REFERENCES software(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  installed_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Ensure unique combination of software and classroom
  UNIQUE(software_id, classroom_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_software_classrooms_software_id ON software_classrooms(software_id);
CREATE INDEX IF NOT EXISTS idx_software_classrooms_classroom_id ON software_classrooms(classroom_id);

-- Enable RLS
ALTER TABLE software_classrooms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view software-classroom assignments" ON software_classrooms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage software-classroom assignments" ON software_classrooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create a view to easily get classrooms for each software
CREATE OR REPLACE VIEW software_with_classrooms AS
SELECT 
  s.*,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'code', c.code,
        'installed_date', sc.installed_date
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) as classrooms,
  COUNT(DISTINCT c.id) as classroom_count
FROM software s
LEFT JOIN software_classrooms sc ON s.id = sc.software_id
LEFT JOIN classrooms c ON sc.classroom_id = c.id
GROUP BY s.id;

-- Grant permissions
GRANT SELECT ON software_classrooms TO authenticated;
GRANT ALL ON software_classrooms TO authenticated;
GRANT SELECT ON software_with_classrooms TO authenticated;

-- Add comments
COMMENT ON TABLE software_classrooms IS 'Junction table linking software to classrooms where it is installed';
COMMENT ON COLUMN software_classrooms.installed_date IS 'Date when the software was installed in the classroom';
COMMENT ON COLUMN software_classrooms.notes IS 'Additional notes about the installation';