-- Ocupació real d'una aula per a una setmana de calendari concreta (dilluns donat).
-- Resol classes (full-semester o setmanes concretes) i reserves aprovades (per
-- franja+setmana i per data), retornant només horaris (sense dades personals).

CREATE OR REPLACE FUNCTION public.classroom_week_occupancy(
  p_classroom_id uuid,
  p_monday date
) RETURNS TABLE (
  the_date date,
  day_of_week int,
  start_time time,
  end_time time,
  kind text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT (p_monday + offs) AS d, (offs + 1) AS dow
    FROM generate_series(0, 4) AS offs
  ),
  day_ctx AS (
    SELECT d.d, d.dow, s.id AS semester_id, s.start_date AS sem_start,
           least(15, greatest(1, (floor((d.d - s.start_date) / 7))::int + 1)) AS week_no
    FROM days d
    LEFT JOIN LATERAL (
      SELECT id, start_date FROM semesters
      WHERE d.d BETWEEN start_date AND end_date
      ORDER BY start_date DESC
      LIMIT 1
    ) s ON true
  )
  -- Classes
  SELECT dc.d, dc.dow, ts.start_time, ts.end_time, 'class'::text
  FROM day_ctx dc
  JOIN assignments a ON a.semester_id = dc.semester_id
  JOIN assignment_classrooms ac ON ac.assignment_id = a.id AND ac.classroom_id = p_classroom_id
  JOIN time_slots ts ON ts.id = a.time_slot_id AND ts.day_of_week = dc.dow
  WHERE dc.semester_id IS NOT NULL
    AND (
      ac.is_full_semester
      OR EXISTS (SELECT 1 FROM assignment_classroom_weeks acw
                 WHERE acw.assignment_classroom_id = ac.id AND acw.week_number = dc.week_no)
    )

  UNION ALL
  -- Reserves per franja (aprovades) actives aquesta setmana
  SELECT dc.d, dc.dow, ts.start_time, ts.end_time, 'reservation'::text
  FROM day_ctx dc
  JOIN space_reservations r ON r.semester_id = dc.semester_id
    AND r.classroom_id = p_classroom_id AND r.status = 'approved' AND r.time_slot_id IS NOT NULL
  JOIN time_slots ts ON ts.id = r.time_slot_id AND ts.day_of_week = dc.dow
  WHERE dc.semester_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM space_reservation_weeks srw
                WHERE srw.reservation_id = r.id AND srw.week_number = dc.week_no)

  UNION ALL
  -- Reserves per data concreta (aprovades)
  SELECT dc.d, dc.dow, r.start_time, r.end_time, 'reservation'::text
  FROM day_ctx dc
  JOIN space_reservations r ON r.classroom_id = p_classroom_id
    AND r.status = 'approved' AND r.reservation_date = dc.d;
$$;

GRANT EXECUTE ON FUNCTION public.classroom_week_occupancy(uuid, date) TO anon, authenticated;
