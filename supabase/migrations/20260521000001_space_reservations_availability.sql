-- Disponibilitat i integració amb horaris per al sistema de reserves.

-- ---------------------------------------------------------------------------
-- Setmanes ocupades d'una franja concreta (aula + time_slot + semestre),
-- combinant CLASSES (assignments) i RESERVES no descartades (pending/approved).
-- Una franja és lliure per a una setmana si NO surt al resultat.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.space_slot_busy_weeks(
  p_classroom_id uuid,
  p_time_slot_id uuid,
  p_semester_id uuid,
  p_exclude_reservation_id uuid DEFAULT NULL
) RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH class_weeks AS (
    SELECT w.week
    FROM public.assignment_classrooms ac
    JOIN public.assignments a ON a.id = ac.assignment_id
    CROSS JOIN LATERAL (
      SELECT generate_series(1, 15) AS week WHERE ac.is_full_semester
      UNION
      SELECT acw.week_number
      FROM public.assignment_classroom_weeks acw
      WHERE acw.assignment_classroom_id = ac.id
    ) w
    WHERE ac.classroom_id = p_classroom_id
      AND a.time_slot_id = p_time_slot_id
      AND a.semester_id = p_semester_id
  ),
  reservation_weeks AS (
    SELECT srw.week_number AS week
    FROM public.space_reservations r
    JOIN public.space_reservation_weeks srw ON srw.reservation_id = r.id
    WHERE r.classroom_id = p_classroom_id
      AND r.time_slot_id = p_time_slot_id
      AND r.semester_id = p_semester_id
      AND r.status IN ('pending', 'approved')
      AND (p_exclude_reservation_id IS NULL OR r.id <> p_exclude_reservation_id)
  )
  SELECT COALESCE(array_agg(DISTINCT week ORDER BY week), ARRAY[]::integer[])
  FROM (
    SELECT week FROM class_weeks
    UNION
    SELECT week FROM reservation_weeks
  ) u;
$$;

GRANT EXECUTE ON FUNCTION public.space_slot_busy_weeks TO anon, authenticated;

COMMENT ON FUNCTION public.space_slot_busy_weeks IS
  'Setmanes (1..15) ocupades d''una franja (aula+time_slot+semestre) per classes o reserves pendents/aprovades. Lliure = no inclosa.';

-- ---------------------------------------------------------------------------
-- Vista: ocupació deguda a reserves APROVADES, expandida a dia/hora, perquè les
-- graelles d'ocupació la puguin pintar igual que les classes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.classroom_reservation_occupancy AS
SELECT
  r.id            AS reservation_id,
  r.classroom_id,
  r.semester_id,
  r.time_slot_id,
  r.title,
  ts.day_of_week,
  ts.start_time,
  ts.end_time,
  COALESCE(
    (SELECT array_agg(srw.week_number ORDER BY srw.week_number)
     FROM public.space_reservation_weeks srw
     WHERE srw.reservation_id = r.id),
    ARRAY[]::integer[]
  ) AS weeks
FROM public.space_reservations r
JOIN public.time_slots ts ON ts.id = r.time_slot_id
WHERE r.status = 'approved';

GRANT SELECT ON public.classroom_reservation_occupancy TO anon, authenticated;

COMMENT ON VIEW public.classroom_reservation_occupancy IS
  'Reserves aprovades expandides a dia/hora per pintar-les a les graelles d''ocupació';
