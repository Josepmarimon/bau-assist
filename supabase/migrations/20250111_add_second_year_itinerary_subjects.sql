-- Add second year subjects with itinerary-specific groups
-- These are the real subjects from page 8 onwards of the 2nd year PDF

-- First, create the subjects if they don't exist
INSERT INTO subjects (code, name, year, semester, credits, type, active)
VALUES 
  ('GDF022', 'Expressió Gràfica I', 2, '1r', 6, 'obligatoria', true),
  ('GDF032', 'Expressió Gràfica II', 2, '2n', 6, 'obligatoria', true),
  ('GDP012', 'Iniciació als Projectes de Disseny I', 2, '1r', 6, 'obligatoria', true),
  ('GDP022', 'Iniciació als Projectes de Disseny II', 2, '2n', 6, 'obligatoria', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  semester = EXCLUDED.semester;

-- Get the semester IDs for the current academic year
WITH current_semesters AS (
  SELECT s.id, s.number, ay.name as academic_year
  FROM semesters s
  JOIN academic_years ay ON s.academic_year_id = ay.id
  WHERE ay.name = '2025-2026'
)
-- Create subject groups for Expressió Gràfica I (1st semester)
INSERT INTO subject_groups (subject_id, semester_id, group_type, group_code, max_students)
SELECT 
  s.id,
  cs.id,
  'practica',
  group_code,
  25
FROM subjects s
CROSS JOIN (VALUES 
  ('Am'), ('At'), 
  ('Gm1'), ('Gm2'), ('Gt'),
  ('Mm'), ('Mt'),
  ('Im'), ('It')
) AS groups(group_code)
CROSS JOIN current_semesters cs
WHERE s.code = 'GDF022' 
  AND cs.number = 1
ON CONFLICT DO NOTHING;

-- Create subject groups for Expressió Gràfica II (2nd semester)
INSERT INTO subject_groups (subject_id, semester_id, group_type, group_code, max_students)
SELECT 
  s.id,
  cs.id,
  'practica',
  group_code,
  25
FROM subjects s
CROSS JOIN (VALUES 
  ('Am'), ('At'), 
  ('Gm1'), ('Gm2'), ('Gt'),
  ('Mm'), ('Mt'),
  ('Im'), ('It')
) AS groups(group_code)
CROSS JOIN current_semesters cs
WHERE s.code = 'GDF032' 
  AND cs.number = 2
ON CONFLICT DO NOTHING;

-- Create subject groups for Iniciació als Projectes de Disseny I (1st semester)
INSERT INTO subject_groups (subject_id, semester_id, group_type, group_code, max_students)
SELECT 
  s.id,
  cs.id,
  'practica',
  group_code,
  25
FROM subjects s
CROSS JOIN (VALUES 
  ('Am'), ('At'), 
  ('Gm1'), ('Gm2'), ('Gt'),
  ('Mm'), ('Mt'),
  ('Im'), ('It')
) AS groups(group_code)
CROSS JOIN current_semesters cs
WHERE s.code = 'GDP012' 
  AND cs.number = 1
ON CONFLICT DO NOTHING;

-- Create subject groups for Iniciació als Projectes de Disseny II (2nd semester)
INSERT INTO subject_groups (subject_id, semester_id, group_type, group_code, max_students)
SELECT 
  s.id,
  cs.id,
  'practica',
  group_code,
  25
FROM subjects s
CROSS JOIN (VALUES 
  ('Am'), ('At'), 
  ('Gm1'), ('Gm2'), ('Gt'),
  ('Mm'), ('Mt'),
  ('Im'), ('It')
) AS groups(group_code)
CROSS JOIN current_semesters cs
WHERE s.code = 'GDP022' 
  AND cs.number = 2
ON CONFLICT DO NOTHING;

-- Now create some sample classroom assignments for these groups
-- You can adjust these based on the actual PDF data
INSERT INTO assignments (subject_id, subject_group_id, classroom_id, semester_id, hours_per_week, notes)
SELECT 
  sg.subject_id,
  sg.id,
  c.id,
  sg.semester_id,
  2.5,
  'Assignació manual - verificar amb PDF'
FROM subject_groups sg
JOIN subjects s ON sg.subject_id = s.id
JOIN classrooms c ON c.code IN ('P.2.1', 'P.2.2', 'P.2.3', 'G.0.3', 'G.0.4', 'L.1.1', 'L.1.2')
WHERE s.code IN ('GDF022', 'GDF032', 'GDP012', 'GDP022')
  AND sg.group_code IN ('Am', 'Gm1')
LIMIT 8
ON CONFLICT DO NOTHING;