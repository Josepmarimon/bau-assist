-- Poda de mòduls fora de l'abast d'assist (assignació d'assignatures a aules + infraestructura).
--
-- IMPORTANT: aquesta migració ELIMINA dades. No l'apliquis fins haver fet la còpia
-- de seguretat de la base de dades (pg_dump del projecte correcte + backups de Supabase).
--
-- Es conserven a propòsit (en ús actiu): graus, schedule_slots i derivats.

BEGIN;

-- 1) Mòdul TFG (Treball Final de Grau) — fora d'abast
DROP TABLE IF EXISTS public.tfg_submissions CASCADE;
DROP TABLE IF EXISTS public.tfg_tribunals CASCADE;
DROP TABLE IF EXISTS public.tfg_allowed_emails CASCADE;
DROP FUNCTION IF EXISTS public.is_tfg_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_email_in_tfg_allowlist(text) CASCADE;

-- 2) Reserves d'espais — fora d'abast
DROP TABLE IF EXISTS public.space_reservation_weeks CASCADE;
DROP TABLE IF EXISTS public.space_reservations CASCADE;
DROP FUNCTION IF EXISTS public.is_space_admin() CASCADE;
DROP FUNCTION IF EXISTS public.request_public_reservation(uuid, date, integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.space_reservations_touch() CASCADE;
-- RPC d'ocupació setmanal: depenia de space_reservations i només l'usava
-- el calendari d'ocupació de la fitxa pública (ja substituït pel calendari O365).
DROP FUNCTION IF EXISTS public.classroom_week_occupancy(uuid, date) CASCADE;

-- 3) Notes d'assignatures (import des d'Airtable) — fora d'abast
DROP TABLE IF EXISTS public.subject_notes CASCADE;

-- 4) Taules legacy de màsters (substituïdes per la taula unificada `programs`)
DROP TABLE IF EXISTS public.masters_software CASCADE;
DROP TABLE IF EXISTS public.masters_programs CASCADE;

COMMIT;
