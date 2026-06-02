-- Reserves públiques (anònimes) per DATA i hora concretes des de les fitxes
-- públiques d'aula. Conviuen amb les reserves per franja+setmana (professors).

-- ---------------------------------------------------------------------------
-- Columnes per al "kind" basat en data
-- ---------------------------------------------------------------------------
ALTER TABLE public.space_reservations
  ADD COLUMN IF NOT EXISTS reservation_date date,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS requester_name text;

-- Les reserves per data no tenen time_slot/semestre/usuari obligatoris
ALTER TABLE public.space_reservations ALTER COLUMN time_slot_id DROP NOT NULL;
ALTER TABLE public.space_reservations ALTER COLUMN semester_id DROP NOT NULL;
ALTER TABLE public.space_reservations ALTER COLUMN requested_by DROP NOT NULL;

-- Integritat: o és per franja (time_slot_id) o és per data (reservation_date)
ALTER TABLE public.space_reservations
  DROP CONSTRAINT IF EXISTS space_reservations_kind_check;
ALTER TABLE public.space_reservations
  ADD CONSTRAINT space_reservations_kind_check
  CHECK (time_slot_id IS NOT NULL OR reservation_date IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_space_reservations_date
  ON public.space_reservations (classroom_id, reservation_date, status);

-- ---------------------------------------------------------------------------
-- Funció pública: valida domini del correu i solapaments, i crea la reserva
-- com a 'pending'. SECURITY DEFINER perquè un usuari anònim la pugui cridar
-- sense obrir un INSERT genèric.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_public_reservation(
  p_classroom_id uuid,
  p_date date,
  p_start time,
  p_end time,
  p_name text,
  p_email text,
  p_description text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_name  text := trim(p_name);
  v_desc  text := trim(p_description);
  v_weekday int;
  v_sem_id uuid;
  v_sem_start date;
  v_week int;
  v_id uuid;
BEGIN
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'El nom és obligatori.';
  END IF;
  IF v_desc IS NULL OR v_desc = '' THEN
    RAISE EXCEPTION 'La descripció de l''activitat és obligatòria.';
  END IF;
  IF v_email !~ '^[^@[:space:]]+@(bau\.cat|student\.bau\.cat)$' THEN
    RAISE EXCEPTION 'El correu ha de ser del domini @bau.cat o @student.bau.cat.';
  END IF;
  IF p_date IS NULL OR p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'Cal indicar data i hores.';
  END IF;
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'L''hora de fi ha de ser posterior a la d''inici.';
  END IF;
  IF p_date < current_date THEN
    RAISE EXCEPTION 'No es poden fer reserves en dates passades.';
  END IF;

  v_weekday := extract(isodow from p_date)::int;

  SELECT id, start_date INTO v_sem_id, v_sem_start
  FROM semesters
  WHERE p_date BETWEEN start_date AND end_date
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_sem_id IS NOT NULL THEN
    v_week := least(15, greatest(1, (floor((p_date - v_sem_start) / 7))::int + 1));

    -- Conflicte amb CLASSES
    IF EXISTS (
      SELECT 1
      FROM assignments a
      JOIN assignment_classrooms ac ON ac.assignment_id = a.id
      JOIN time_slots ts ON ts.id = a.time_slot_id
      WHERE ac.classroom_id = p_classroom_id
        AND a.semester_id = v_sem_id
        AND ts.day_of_week = v_weekday
        AND ts.start_time < p_end AND ts.end_time > p_start
        AND (
          ac.is_full_semester
          OR EXISTS (SELECT 1 FROM assignment_classroom_weeks acw
                     WHERE acw.assignment_classroom_id = ac.id AND acw.week_number = v_week)
        )
    ) THEN
      RAISE EXCEPTION 'Aquesta franja ja està ocupada per una classe.';
    END IF;

    -- Conflicte amb reserves per FRANJA (professors) que cobreixen aquesta setmana/dia
    IF EXISTS (
      SELECT 1
      FROM space_reservations r
      JOIN time_slots ts ON ts.id = r.time_slot_id
      WHERE r.classroom_id = p_classroom_id
        AND r.status IN ('pending','approved')
        AND r.time_slot_id IS NOT NULL
        AND r.semester_id = v_sem_id
        AND ts.day_of_week = v_weekday
        AND ts.start_time < p_end AND ts.end_time > p_start
        AND EXISTS (SELECT 1 FROM space_reservation_weeks srw
                    WHERE srw.reservation_id = r.id AND srw.week_number = v_week)
    ) THEN
      RAISE EXCEPTION 'Aquesta franja ja té una reserva.';
    END IF;
  END IF;

  -- Conflicte amb reserves per DATA concreta
  IF EXISTS (
    SELECT 1 FROM space_reservations r
    WHERE r.classroom_id = p_classroom_id
      AND r.status IN ('pending','approved')
      AND r.reservation_date = p_date
      AND r.start_time < p_end AND r.end_time > p_start
  ) THEN
    RAISE EXCEPTION 'Ja hi ha una reserva en aquesta data i hora.';
  END IF;

  INSERT INTO space_reservations (
    classroom_id, semester_id, reservation_date, start_time, end_time,
    requester_name, requester_email, title, description, status, requested_by
  ) VALUES (
    p_classroom_id, v_sem_id, p_date, p_start, p_end,
    v_name, v_email, left(v_desc, 120), v_desc, 'pending', NULL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_public_reservation(uuid, date, time, time, text, text, text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- La vista d'ocupació ha d'incloure també les reserves per data
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.classroom_reservation_occupancy;
CREATE VIEW public.classroom_reservation_occupancy
WITH (security_invoker = on) AS
-- Reserves per franja
SELECT
  r.id AS reservation_id,
  r.classroom_id,
  r.semester_id,
  r.title,
  ts.day_of_week,
  ts.start_time,
  ts.end_time
FROM public.space_reservations r
JOIN public.time_slots ts ON ts.id = r.time_slot_id
WHERE r.status = 'approved' AND r.time_slot_id IS NOT NULL
UNION ALL
-- Reserves per data concreta
SELECT
  r.id AS reservation_id,
  r.classroom_id,
  r.semester_id,
  r.title,
  extract(isodow FROM r.reservation_date)::int AS day_of_week,
  r.start_time,
  r.end_time
FROM public.space_reservations r
WHERE r.status = 'approved' AND r.reservation_date IS NOT NULL;

GRANT SELECT ON public.classroom_reservation_occupancy TO anon, authenticated;
