-- Create view to aggregate software with classroom information
CREATE OR REPLACE VIEW software_with_classrooms AS
SELECT 
  s.id,
  s.name,
  s.version,
  s.category,
  s.is_required,
  s.is_portable,
  s.created_at,
  s.updated_at,
  s.notes,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'classroom_id', c.id,
        'classroom_name', c.name,
        'licenses', cs.licenses
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) AS classrooms
FROM software s
LEFT JOIN classroom_software cs ON s.id = cs.software_id
LEFT JOIN classrooms c ON cs.classroom_id = c.id
GROUP BY s.id, s.name, s.version, s.category, s.is_required, s.is_portable, s.created_at, s.updated_at, s.notes;

-- Grant permissions
GRANT SELECT ON software_with_classrooms TO authenticated;
GRANT SELECT ON software_with_classrooms TO anon;