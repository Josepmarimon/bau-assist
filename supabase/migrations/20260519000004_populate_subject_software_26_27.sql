-- Pobla `subject_software` per al curs 2026-2027 amb les necessitats de les 12
-- assignatures de Disseny que el 25-26 van anar 100% a aules tipus 'Informàtica'.
-- Font: exports d'Airtable (Graus Disseny Perfil tècnic).
-- Per a assignatures sense declaració al 26-27 s'arrossega el software del 25-26
-- (o 24-25 com a fallback) i es marca amb un text descriptiu al camp `notes`.
--
-- Assignatures sense dades a cap any que queden fora (cal recordar als professors
-- d'omplir Airtable):
--   - Infografia I (Isabel Quiles)
--   - Programació per Dissenyadors (Anna Carreras / Lucía Segurajáuregui)
--   - Taller d'Audiovisual I (Jose Ramon Madrid / Luis Miguel Colaço)
--   - Tipografia en Moviment (Raúl Maldonado)

BEGIN;

-- Helper: insereix una fila si no existeix
CREATE TEMP TABLE _sw_inserts (
  subject_code text,
  software_name text,
  origen text
);

INSERT INTO _sw_inserts (subject_code, software_name, origen) VALUES
  -- Animació Digital II
  ('GDVA53', 'Blender', 'arrossegat 24-25 (no actualitzat aquest any)'),
  -- Animació Digital III
  ('GDVA04', 'Unreal', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVA04', 'Cinema 4D', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVA04', 'VLC', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVA04', 'Processing', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVA04', 'Touch Designer', 'arrossegat 25-26 (no actualitzat aquest any)'),
  -- Creació i Autoria Digital I
  ('GDVA13', 'Suite Adobe completa', 'arrossegat 24-25 (no actualitzat aquest any)'),
  -- Creació i Autoria Digital III
  ('GDVA14', 'Processing', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVA14', 'Arduino', 'arrossegat 25-26 (no actualitzat aquest any)'),
  -- Infografia II (declarat)
  ('GDVG93', 'Teams', 'declarat'),
  ('GDVG93', 'Suite Adobe completa', 'declarat'),
  ('GDVG93', 'Figma', 'declarat'),
  -- Introducció al Disseny Web
  ('GDVG34', 'Sublime Text', 'arrossegat 24-25 (no actualitzat aquest any)'),
  ('GDVG34', 'Filezilla', 'arrossegat 24-25 (no actualitzat aquest any)'),
  -- Tècniques Infogràfiques I
  ('GDVI23', '3D MAX', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI23', 'Rhino', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI23', 'VRAY', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI23', 'Autocad', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI23', 'Suite Adobe completa', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI23', '5D Render', 'arrossegat 25-26 (no actualitzat aquest any)'),
  -- Tècniques Infogràfiques II
  ('GDVI73', 'Autocad', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI73', 'Suite Adobe completa', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI73', '3D MAX', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI73', 'Rhino', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI73', 'VRAY', 'arrossegat 25-26 (no actualitzat aquest any)'),
  ('GDVI73', '5D Render', 'arrossegat 25-26 (no actualitzat aquest any)');

-- Esborra primer qualsevol fila preexistent per (subject, software, 2026-2027)
-- per evitar duplicats en re-executar.
DELETE FROM public.subject_software ss
USING _sw_inserts t, public.subjects subj, public.software sw
WHERE subj.code = t.subject_code
  AND sw.name = t.software_name
  AND ss.subject_id = subj.id
  AND ss.software_id = sw.id
  AND ss.academic_year = '2026-2027';

-- Insereix les noves
INSERT INTO public.subject_software (subject_id, software_id, is_required, academic_year, notes)
SELECT subj.id, sw.id, true, '2026-2027', t.origen
FROM _sw_inserts t
JOIN public.subjects subj ON subj.code = t.subject_code
JOIN public.software sw ON sw.name = t.software_name;

COMMIT;
