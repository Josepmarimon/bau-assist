-- Copia les dades estructurals del curs 2025-2026 al 2026-2027.
-- L'usuari podrà modificar les dades del 26-27 sense afectar el 25-26.
--
-- Ordre:
--  1. subject_groups (font de FK)
--  2. assignments (referencien subject_groups)
--  3. teacher_group_assignments (referencien subject_groups, academic_year string)
--  4. course_offerings (academic_year_id + semester_id)
--  5. subject_software (academic_year string)

BEGIN;

-- Pas 0: variables (CTE no funciona entre statements; usem semester_mapping com a temp table)
CREATE TEMP TABLE semester_mapping (
  old_id uuid PRIMARY KEY,
  new_id uuid NOT NULL,
  number int NOT NULL
);

INSERT INTO semester_mapping (old_id, new_id, number)
SELECT
  s_old.id, s_new.id, s_old.number
FROM public.semesters s_old
JOIN public.academic_years ay_old ON ay_old.id = s_old.academic_year_id AND ay_old.name = '2025-2026'
JOIN public.academic_years ay_new ON ay_new.name = '2026-2027'
JOIN public.semesters s_new ON s_new.academic_year_id = ay_new.id AND s_new.number = s_old.number;

-- Pas 1: subject_groups. Pre-generem nous UUIDs per poder mapejar en passos posteriors.
CREATE TEMP TABLE subject_group_mapping (
  old_id uuid PRIMARY KEY,
  new_id uuid NOT NULL DEFAULT gen_random_uuid()
);

INSERT INTO subject_group_mapping (old_id)
SELECT sg.id
FROM public.subject_groups sg
JOIN semester_mapping sm ON sm.old_id = sg.semester_id;

INSERT INTO public.subject_groups (id, subject_id, semester_id, group_code, max_students)
SELECT
  m.new_id,
  sg.subject_id,
  sm.new_id,
  sg.group_code,
  sg.max_students
FROM public.subject_groups sg
JOIN subject_group_mapping m ON m.old_id = sg.id
JOIN semester_mapping sm ON sm.old_id = sg.semester_id;

-- Pas 2: assignments (un per (semester, subject_group, ...) — fem una copia 1:1 amb FK remapejada).
-- NOTA: subject_group_id és NOT NULL i alguns assignments orphans poden apuntar a subject_groups
-- que NO pertanyen a la mateixa semester. Usem INNER JOIN amb subject_group_mapping per saltar-los.
INSERT INTO public.assignments (
  semester_id, subject_id, subject_group_id, teacher_id, classroom_id,
  time_slot_id, student_group_id, hours_per_week, color, notes, created_by
)
SELECT
  sm.new_id,
  a.subject_id,
  sgm.new_id,
  a.teacher_id,
  a.classroom_id,
  a.time_slot_id,
  a.student_group_id,
  a.hours_per_week,
  a.color,
  a.notes,
  a.created_by
FROM public.assignments a
JOIN semester_mapping sm ON sm.old_id = a.semester_id
JOIN subject_group_mapping sgm ON sgm.old_id = a.subject_group_id;

-- Pas 3: teacher_group_assignments — academic_year és string.
INSERT INTO public.teacher_group_assignments (
  teacher_id, subject_group_id, academic_year, ects_assigned, is_coordinator, notes
)
SELECT
  tga.teacher_id,
  sgm.new_id,
  '2026-2027',
  tga.ects_assigned,
  tga.is_coordinator,
  tga.notes
FROM public.teacher_group_assignments tga
JOIN subject_group_mapping sgm ON sgm.old_id = tga.subject_group_id
WHERE tga.academic_year = '2025-2026';

-- Pas 4: course_offerings.
INSERT INTO public.course_offerings (
  academic_year_id, semester_id, subject_id, coordination_area, total_ects, notes
)
SELECT
  (SELECT id FROM public.academic_years WHERE name='2026-2027'),
  sm.new_id,
  co.subject_id,
  co.coordination_area,
  co.total_ects,
  co.notes
FROM public.course_offerings co
JOIN semester_mapping sm ON sm.old_id = co.semester_id
WHERE co.academic_year_id = (SELECT id FROM public.academic_years WHERE name='2025-2026');

-- Pas 5: subject_software — academic_year és string.
INSERT INTO public.subject_software (subject_id, software_id, is_required, academic_year, notes)
SELECT
  ss.subject_id,
  ss.software_id,
  ss.is_required,
  '2026-2027',
  ss.notes
FROM public.subject_software ss
WHERE ss.academic_year = '2025-2026';

COMMIT;
