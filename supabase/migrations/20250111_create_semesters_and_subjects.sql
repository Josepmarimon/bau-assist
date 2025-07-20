-- Create semesters for 2025-2026 if they don't exist
INSERT INTO semesters (academic_year_id, number, name, start_date, end_date)
SELECT 
  ay.id,
  semester_num,
  CASE 
    WHEN semester_num = 1 THEN 'Primer Semestre 2025-2026'
    ELSE 'Segon Semestre 2025-2026'
  END,
  CASE 
    WHEN semester_num = 1 THEN '2025-09-15'::date
    ELSE '2026-02-01'::date
  END,
  CASE 
    WHEN semester_num = 1 THEN '2026-01-31'::date
    ELSE '2026-06-30'::date
  END
FROM academic_years ay
CROSS JOIN (VALUES (1), (2)) AS s(semester_num)
WHERE ay.name = '2025-2026'
ON CONFLICT DO NOTHING;

-- Now create the subjects if they don't exist
INSERT INTO subjects (code, name, year, semester, credits, type, active)
VALUES 
  ('GDF022', 'Expressió Gràfica I', 2, '1r', 6, 'obligatoria', true),
  ('GDF032', 'Expressió Gràfica II', 2, '2n', 6, 'obligatoria', true),
  ('GDP012', 'Iniciació als Projectes de Disseny I', 2, '1r', 6, 'obligatoria', true),
  ('GDP022', 'Iniciació als Projectes de Disseny II', 2, '2n', 6, 'obligatoria', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  semester = EXCLUDED.semester;

-- Create subject groups for all itinerary groups
DO $$
DECLARE
  sem1_id UUID;
  sem2_id UUID;
  subject_rec RECORD;
BEGIN
  -- Get semester IDs for current academic year
  SELECT s.id INTO sem1_id
  FROM semesters s
  JOIN academic_years ay ON s.academic_year_id = ay.id
  WHERE ay.name = '2025-2026' AND s.number = 1;
  
  SELECT s.id INTO sem2_id
  FROM semesters s
  JOIN academic_years ay ON s.academic_year_id = ay.id
  WHERE ay.name = '2025-2026' AND s.number = 2;
  
  -- Create groups for each subject
  FOR subject_rec IN 
    SELECT id, code, semester FROM subjects 
    WHERE code IN ('GDF022', 'GDF032', 'GDP012', 'GDP022')
  LOOP
    -- Insert groups for each itinerary
    INSERT INTO subject_groups (subject_id, semester_id, group_type, group_code, max_students)
    SELECT 
      subject_rec.id,
      CASE 
        WHEN subject_rec.semester = '1r' THEN sem1_id
        ELSE sem2_id
      END,
      'practica',
      group_code,
      25
    FROM (VALUES 
      ('Am'), ('At'), 
      ('Gm1'), ('Gm2'), ('Gt'),
      ('Mm'), ('Mt'),
      ('Im'), ('It')
    ) AS groups(group_code)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;