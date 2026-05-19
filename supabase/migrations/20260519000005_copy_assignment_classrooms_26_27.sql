-- Copia les `assignment_classrooms` (i les `assignment_classroom_weeks`
-- relacionades) del 25-26 al 26-27. La migration anterior `20260519000002`
-- va copiar els assignments però no les seves aules — sense això la UI no
-- pot saber quines assignatures del 26-27 fan servir aules d'informàtica.
--
-- Estratègia: reconstruir el mapping antic→nou per (subject_groups → assignments)
-- comparant els camps que es van preservar a la còpia.

BEGIN;

-- 1. Mapping subject_groups 25-26 → 26-27
CREATE TEMP TABLE sg_map AS
SELECT sg25.id AS old_id, sg26.id AS new_id
FROM public.subject_groups sg25
JOIN public.semesters s25 ON s25.id = sg25.semester_id
JOIN public.academic_years ay25 ON ay25.id = s25.academic_year_id AND ay25.name = '2025-2026'
JOIN public.academic_years ay26 ON ay26.name = '2026-2027'
JOIN public.semesters s26 ON s26.academic_year_id = ay26.id AND s26.number = s25.number
JOIN public.subject_groups sg26
  ON sg26.semester_id = s26.id
 AND sg26.subject_id = sg25.subject_id
 AND sg26.group_code = sg25.group_code;

-- 2. Mapping assignments 25-26 → 26-27 (per columnes preservades)
CREATE TEMP TABLE a_map AS
SELECT a25.id AS old_id, a26.id AS new_id
FROM public.assignments a25
JOIN public.semesters s25 ON s25.id = a25.semester_id
JOIN public.academic_years ay25 ON ay25.id = s25.academic_year_id AND ay25.name = '2025-2026'
JOIN sg_map sgm ON sgm.old_id = a25.subject_group_id
JOIN public.assignments a26
  ON a26.subject_id = a25.subject_id
 AND a26.subject_group_id = sgm.new_id
 AND a26.teacher_id IS NOT DISTINCT FROM a25.teacher_id
 AND a26.time_slot_id IS NOT DISTINCT FROM a25.time_slot_id
 AND a26.student_group_id IS NOT DISTINCT FROM a25.student_group_id
 AND a26.hours_per_week = a25.hours_per_week
 AND a26.color IS NOT DISTINCT FROM a25.color
JOIN public.semesters s26 ON s26.id = a26.semester_id
JOIN public.academic_years ay26 ON ay26.id = s26.academic_year_id AND ay26.name = '2026-2027';

-- 3. Esborrar qualsevol assignment_classroom preexistent del 26-27 per evitar duplicats
DELETE FROM public.assignment_classrooms
WHERE assignment_id IN (SELECT new_id FROM a_map);

-- 4. Pre-generar nous IDs d'assignment_classrooms per poder mapejar les weeks
CREATE TEMP TABLE ac_map (
  old_id uuid PRIMARY KEY,
  new_id uuid NOT NULL DEFAULT gen_random_uuid()
);
INSERT INTO ac_map (old_id)
SELECT ac.id
FROM public.assignment_classrooms ac
WHERE ac.assignment_id IN (SELECT old_id FROM a_map);

-- 5. Inserir assignment_classrooms al 26-27
INSERT INTO public.assignment_classrooms (
  id, assignment_id, classroom_id, created_by, is_full_semester, week_range_type
)
SELECT
  acm.new_id,
  am.new_id,
  ac.classroom_id,
  ac.created_by,
  ac.is_full_semester,
  ac.week_range_type
FROM public.assignment_classrooms ac
JOIN ac_map acm ON acm.old_id = ac.id
JOIN a_map am ON am.old_id = ac.assignment_id;

-- 6. Inserir assignment_classroom_weeks (relacionades a les acabades d'inserir)
INSERT INTO public.assignment_classroom_weeks (
  assignment_classroom_id, week_number, created_by
)
SELECT acm.new_id, acw.week_number, acw.created_by
FROM public.assignment_classroom_weeks acw
JOIN ac_map acm ON acm.old_id = acw.assignment_classroom_id;

COMMIT;
