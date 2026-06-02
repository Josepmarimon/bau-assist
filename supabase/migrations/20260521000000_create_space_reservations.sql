-- Sistema de reserves d'espais (MVP): professors reserven franges lliures d'aules
-- per a activitats lectives; administració accepta o refusa.
--
-- Una reserva = (aula + franja horària existent + semestre) amb una o més setmanes
-- (1..15), reutilitzant el model d'horaris (time_slots + setmanes) per integrar-se
-- amb la detecció de conflictes i amb les graelles d'ocupació.

-- ---------------------------------------------------------------------------
-- Helper d'admin (independent del mòdul TFG per no acoblar-s'hi)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_space_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Taules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.space_reservations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  time_slot_id  uuid NOT NULL REFERENCES public.time_slots(id),
  semester_id   uuid NOT NULL REFERENCES public.semesters(id),
  requested_by  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  requester_email text,
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by   uuid REFERENCES auth.users(id),
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.space_reservation_weeks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.space_reservations(id) ON DELETE CASCADE,
  week_number    integer NOT NULL CHECK (week_number BETWEEN 1 AND 15),
  UNIQUE (reservation_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_space_reservations_lookup
  ON public.space_reservations (classroom_id, time_slot_id, semester_id, status);
CREATE INDEX IF NOT EXISTS idx_space_reservations_requested_by
  ON public.space_reservations (requested_by);
CREATE INDEX IF NOT EXISTS idx_space_reservation_weeks_reservation
  ON public.space_reservation_weeks (reservation_id);

-- ---------------------------------------------------------------------------
-- updated_at automàtic
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.space_reservations_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_space_reservations_touch ON public.space_reservations;
CREATE TRIGGER trg_space_reservations_touch
  BEFORE UPDATE ON public.space_reservations
  FOR EACH ROW EXECUTE FUNCTION public.space_reservations_touch();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.space_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_reservation_weeks ENABLE ROW LEVEL SECURITY;

-- space_reservations:
--  · llegir: el sol·licitant (les seves), l'admin (totes) i qualsevol (només approved,
--    perquè les graelles públiques les puguin pintar)
DROP POLICY IF EXISTS "Read own/approved/admin reservations" ON public.space_reservations;
CREATE POLICY "Read own/approved/admin reservations"
  ON public.space_reservations FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = requested_by
    OR public.is_space_admin()
  );

--  · crear: només per a un mateix
DROP POLICY IF EXISTS "Create own reservations" ON public.space_reservations;
CREATE POLICY "Create own reservations"
  ON public.space_reservations FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

--  · modificar: el sol·licitant mentre està pendent (per cancel·lar); l'admin sempre
--    (per acceptar/refusar)
DROP POLICY IF EXISTS "Update own pending or admin reservations" ON public.space_reservations;
CREATE POLICY "Update own pending or admin reservations"
  ON public.space_reservations FOR UPDATE
  USING (
    (auth.uid() = requested_by AND status = 'pending')
    OR public.is_space_admin()
  )
  WITH CHECK (
    (auth.uid() = requested_by AND status IN ('pending', 'cancelled'))
    OR public.is_space_admin()
  );

--  · esborrar: el sol·licitant (les seves pendents) o l'admin
DROP POLICY IF EXISTS "Delete own pending or admin reservations" ON public.space_reservations;
CREATE POLICY "Delete own pending or admin reservations"
  ON public.space_reservations FOR DELETE
  USING (
    (auth.uid() = requested_by AND status = 'pending')
    OR public.is_space_admin()
  );

-- space_reservation_weeks: segueixen la visibilitat de la reserva pare
DROP POLICY IF EXISTS "Read reservation weeks" ON public.space_reservation_weeks;
CREATE POLICY "Read reservation weeks"
  ON public.space_reservation_weeks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.space_reservations r
      WHERE r.id = reservation_id
        AND (r.status = 'approved' OR r.requested_by = auth.uid() OR public.is_space_admin())
    )
  );

DROP POLICY IF EXISTS "Write reservation weeks" ON public.space_reservation_weeks;
CREATE POLICY "Write reservation weeks"
  ON public.space_reservation_weeks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.space_reservations r
      WHERE r.id = reservation_id
        AND ((r.requested_by = auth.uid() AND r.status = 'pending') OR public.is_space_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.space_reservations r
      WHERE r.id = reservation_id
        AND ((r.requested_by = auth.uid() AND r.status = 'pending') OR public.is_space_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (PostgREST)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.space_reservations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_reservations TO authenticated;
GRANT SELECT ON public.space_reservation_weeks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_reservation_weeks TO authenticated;

COMMENT ON TABLE public.space_reservations IS 'Reserves d''espais per a activitats lectives (sol·licitud amb estat aprovat per administració)';
COMMENT ON TABLE public.space_reservation_weeks IS 'Setmanes (1..15) que cobreix cada reserva, com assignment_classroom_weeks';
