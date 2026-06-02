-- Enduriment de seguretat del mòdul de reserves (resol advisors de Supabase):
--  · la vista ha de respectar la RLS del qui consulta (evita SECURITY DEFINER implícit)
--  · search_path fix del trigger
--  · les funcions SECURITY DEFINER no les ha d'executar anon (només personal autenticat)

ALTER VIEW public.classroom_reservation_occupancy SET (security_invoker = on);

ALTER FUNCTION public.space_reservations_touch() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_space_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_space_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.space_slot_busy_weeks(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.space_slot_busy_weeks(uuid, uuid, uuid, uuid) TO authenticated;
