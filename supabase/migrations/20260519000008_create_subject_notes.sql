-- Taula per emmagatzemar les notes/comentaris de cada assignatura per curs.
-- Origen: camps multilineText de les taules "Graus Disseny Perfil tècnic" i
-- "Graus BBAA Perfil tècnic" a Airtable.
--
-- Una assignatura pot tenir múltiples notes (per categoria) i les notes són
-- específiques per a un curs acadèmic.

CREATE TABLE IF NOT EXISTS public.subject_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year varchar NOT NULL,
  category varchar NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (subject_id, academic_year, category)
);

CREATE INDEX IF NOT EXISTS idx_subject_notes_subject_year
  ON public.subject_notes(subject_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_subject_notes_year
  ON public.subject_notes(academic_year);

-- RLS: dades públiques de planificació docent, accés via API anon.
ALTER TABLE public.subject_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subject_notes"
  ON public.subject_notes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage subject_notes"
  ON public.subject_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
