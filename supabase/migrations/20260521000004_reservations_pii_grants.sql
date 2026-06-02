-- Privadesa: el rol anònim no ha de poder llegir les dades personals del
-- sol·licitant (correu, nom) ni notes internes des de la taula directament.
-- La graella pública només consulta la vista classroom_reservation_occupancy
-- (sense PII), així que limitem anon a columnes no sensibles.

REVOKE SELECT ON public.space_reservations FROM anon;

GRANT SELECT (
  id, classroom_id, semester_id, time_slot_id,
  reservation_date, start_time, end_time, status, title
) ON public.space_reservations TO anon;
