-- =====================================================================
-- TFG submissions: Pla B per a la plataforma de pujada de TFGs
-- =====================================================================
-- Substitueix temporalment la plataforma WordPress + ACF PRO mentre s'arregla.
-- Els noms de columna repliquen els meta_key d'ACF (incloent-hi els errors
-- ortogràfics originals com "correu_electrponic") per fer trivial la
-- migració de dades cap a WordPress quan torni a funcionar.
--
-- A WP, el TFG no és un Custom Post Type sinó un `post` normal amb la
-- taxonomia `tfg` assignada. L'export ha de reflectir-ho.
--
-- ACF export font (TFG = group_64351aea8e4c5):
--   /Users/josepmarimon/Desktop/acf-export-2026-05-20.json

-- ---------------------------------------------------------------------
-- Taula de tribunals (editable des del backoffice)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tfg_tribunals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nom complet que apareix al desplegable i a l'export. Ex: "G7. #Memòria #Arxiu I #Identitat (Branding)"
  name text NOT NULL UNIQUE,
  -- Itinerari associat (per filtrar el desplegable). NULL = visible per a tots.
  -- Valors usuals: 'Disseny Gràfic', 'Disseny Espais', 'Disseny Audiovisual', 'Disseny Moda'
  itinerari text,
  -- Ordre de visualització al desplegable
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tfg_tribunals_itinerari
  ON public.tfg_tribunals(itinerari) WHERE active = true;

-- ---------------------------------------------------------------------
-- Allowlist d'emails autoritzats a demanar magic link
-- ---------------------------------------------------------------------
-- Només els emails d'aquesta llista poden iniciar sessió i pujar un TFG.
-- L'admin carrega aquesta llista (manual o per CSV) abans d'enviar els magic links.
CREATE TABLE IF NOT EXISTS public.tfg_allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  -- Camps opcionals pre-emplenats des del CSV de matriculats (per autocompletar el formulari)
  full_name text,
  itinerari text,
  tutor text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tfg_allowed_emails_email
  ON public.tfg_allowed_emails(lower(email));

-- ---------------------------------------------------------------------
-- Taula principal: submissions de TFG
-- ---------------------------------------------------------------------
-- Una fila per cada TFG. Estructura plana (no normalitzada) per fer
-- la migració WP All Import 1:1 amb els meta_key d'ACF.
--
-- Convenció per fitxers (jsonb):
--   Imatge / fitxer únic: { "path": "uuid/uuid/...", "url": "https://...", "name": "x.pdf", "mime": "application/pdf", "size": 1234 }
--   Galeria: array d'objectes amb la mateixa estructura
--
-- Convenció per columnes amb ":" al meta_key d'ACF:
--   ACF: format_de_memoria_del_projecte:  →  Postgres: format_de_memoria_del_projecte
--   El mapping es gestiona a l'export per WordPress (no embrutim la columna SQL).

CREATE TABLE IF NOT EXISTS public.tfg_submissions (
  -- Sistema -----------------------------------------------------------
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,

  -- Autoria -----------------------------------------------------------
  autor text,
  afegir_un_altre_autora boolean NOT NULL DEFAULT false,
  autora text,
  correu_electrponic text,  -- (sic) coincideix amb el typo d'ACF

  -- Metadades del projecte -------------------------------------------
  titol text,
  "any" int,  -- ACF date_picker amb format Y (any). "any" està entre cometes perquè és paraula reservada de SQL.
  itinerari_matriculat text,  -- 'Disseny Gràfic' | 'Disseny Espais' | 'Disseny Audiovisual' | 'Disseny Moda'
  tribunal_assignat text,  -- text lliure, validat contra tfg_tribunals al formulari
  tipologia_de_projecte text[] NOT NULL DEFAULT '{}',  -- checkbox multi-selecció

  -- Abstracts ---------------------------------------------------------
  abstract_en_catala text,
  abstract_espanyol text,
  abstract_angles text,

  -- Imatges i galeries -----------------------------------------------
  imatge_representativa jsonb,  -- objecte únic {path, url, name, mime, size}
  tens_gif_animats boolean NOT NULL DEFAULT false,
  galeria_gif_animat jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array
  imatges_projecte jsonb NOT NULL DEFAULT '[]'::jsonb,    -- array

  -- Memòria del projecte ---------------------------------------------
  format_de_memoria_del_projecte text[] NOT NULL DEFAULT '{}',  -- ACF: amb ":" al meta_key, mapejat a l'export
  enllac_a_larxiu_onedrive_google_drive_dropbox text,
  memoria jsonb,  -- PDF de la memòria
  enllac_a_la_memoria_en_format_web text,
  pdf_de_la_memoria jsonb,  -- PDF d'arxiu si la memòria és en format web
  te_informacio_addicional boolean NOT NULL DEFAULT false,
  documentacio_addicional jsonb,
  enllac_a_la_documentacio_onedrive text,
  url_projecte text,

  -- Vídeos (fins a 3) ------------------------------------------------
  el_projecte_te_video boolean NOT NULL DEFAULT false,
  on_estan_els_teus_videos text,  -- 'Youtube' | 'Vimeo'
  video_del_projecte text,        -- URL del vídeo 1 a YouTube (ACF oembed)
  video_de_vimeo text,            -- URL del vídeo 1 a Vimeo
  el_video_te_password boolean NOT NULL DEFAULT false,
  contrasenya_del_video_1 text,
  el_projecte_te_segon_video boolean NOT NULL DEFAULT false,
  video_2_projecte text,          -- URL vídeo 2 YouTube
  video_2_projecte_copia text,    -- URL vídeo 2 Vimeo (nom original d'ACF)
  el_video_te_password_2 boolean NOT NULL DEFAULT false,
  contrasenya_del_video_2 text,
  el_projecte_te_segon_video_3 boolean NOT NULL DEFAULT false,  -- (sic) nom original d'ACF per al toggle del vídeo 3
  video_3_projecte text,          -- URL vídeo 3 YouTube
  video_3_projecte_vimeo text,    -- URL vídeo 3 Vimeo
  el_video_te_password_3 boolean NOT NULL DEFAULT false,
  contrasenya_del_video_3 text,

  -- Fitxers addicionals ----------------------------------------------
  te_arxius_addicionals boolean NOT NULL DEFAULT false,
  fitxers_executables jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array de fitxers

  -- Constraint: un cop submitted, ha de tenir els camps obligatoris
  CONSTRAINT submitted_requires_required_fields CHECK (
    status = 'draft' OR (
      autor IS NOT NULL AND autor <> ''
      AND correu_electrponic IS NOT NULL AND correu_electrponic <> ''
      AND titol IS NOT NULL AND titol <> ''
      AND "any" IS NOT NULL
      AND itinerari_matriculat IS NOT NULL AND itinerari_matriculat <> ''
      AND tribunal_assignat IS NOT NULL AND tribunal_assignat <> ''
      AND abstract_en_catala IS NOT NULL AND abstract_en_catala <> ''
      AND abstract_espanyol IS NOT NULL AND abstract_espanyol <> ''
      AND abstract_angles IS NOT NULL AND abstract_angles <> ''
      AND imatge_representativa IS NOT NULL
      AND array_length(format_de_memoria_del_projecte, 1) IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_tfg_submissions_user_id ON public.tfg_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tfg_submissions_status ON public.tfg_submissions(status);
CREATE INDEX IF NOT EXISTS idx_tfg_submissions_itinerari ON public.tfg_submissions(itinerari_matriculat) WHERE status = 'submitted';
CREATE INDEX IF NOT EXISTS idx_tfg_submissions_tribunal ON public.tfg_submissions(tribunal_assignat) WHERE status = 'submitted';

-- ---------------------------------------------------------------------
-- Trigger per actualitzar updated_at i submitted_at automàticament
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tfg_submissions_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  -- Marca submitted_at la primera vegada que passa a 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') THEN
    NEW.submitted_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tfg_submissions_touch ON public.tfg_submissions;
CREATE TRIGGER trg_tfg_submissions_touch
  BEFORE UPDATE ON public.tfg_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.tfg_submissions_touch();

-- =====================================================================
-- Row Level Security
-- =====================================================================
ALTER TABLE public.tfg_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tfg_tribunals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tfg_allowed_emails ENABLE ROW LEVEL SECURITY;

-- Helper: és admin de bau-assist? Consulta public.user_profiles.role (patró
-- d'aquesta app) i, com a fallback, raw_user_meta_data->>'role'.
CREATE OR REPLACE FUNCTION public.is_tfg_admin()
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

-- ----- tfg_submissions ----------------------------------------------
DROP POLICY IF EXISTS "Student reads own TFG submissions" ON public.tfg_submissions;
CREATE POLICY "Student reads own TFG submissions"
  ON public.tfg_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_tfg_admin());

DROP POLICY IF EXISTS "Student inserts own TFG submissions" ON public.tfg_submissions;
CREATE POLICY "Student inserts own TFG submissions"
  ON public.tfg_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- L'estudiant només pot modificar mentre està en draft.
-- L'admin pot modificar sempre (per esmenar errors, marcar com a 'reviewed', etc).
DROP POLICY IF EXISTS "Student updates own draft TFG submissions" ON public.tfg_submissions;
CREATE POLICY "Student updates own draft TFG submissions"
  ON public.tfg_submissions FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'draft')
    OR public.is_tfg_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id AND status IN ('draft', 'submitted'))
    OR public.is_tfg_admin()
  );

DROP POLICY IF EXISTS "Student deletes own draft TFG submissions" ON public.tfg_submissions;
CREATE POLICY "Student deletes own draft TFG submissions"
  ON public.tfg_submissions FOR DELETE
  USING (
    (auth.uid() = user_id AND status = 'draft')
    OR public.is_tfg_admin()
  );

-- ----- tfg_tribunals ------------------------------------------------
-- Llegibles per qualsevol usuari autenticat (es necessiten al formulari).
-- Només l'admin pot escriure.
DROP POLICY IF EXISTS "Anyone authenticated reads tribunals" ON public.tfg_tribunals;
CREATE POLICY "Anyone authenticated reads tribunals"
  ON public.tfg_tribunals FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin manages tribunals" ON public.tfg_tribunals;
CREATE POLICY "Admin manages tribunals"
  ON public.tfg_tribunals FOR ALL
  USING (public.is_tfg_admin())
  WITH CHECK (public.is_tfg_admin());

-- ----- tfg_allowed_emails -------------------------------------------
-- Només l'admin pot llegir/escriure la taula sencera.
DROP POLICY IF EXISTS "Admin manages allowed emails" ON public.tfg_allowed_emails;
CREATE POLICY "Admin manages allowed emails"
  ON public.tfg_allowed_emails FOR ALL
  USING (public.is_tfg_admin())
  WITH CHECK (public.is_tfg_admin());

-- Funció SECURITY DEFINER perquè un anònim pugui comprovar si UN email concret
-- està a l'allowlist sense poder enumerar la llista sencera. S'utilitza des de
-- /tfg/login abans de demanar el magic link.
CREATE OR REPLACE FUNCTION public.is_email_in_tfg_allowlist(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tfg_allowed_emails
    WHERE lower(email) = lower(p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_in_tfg_allowlist(text) TO anon, authenticated;

-- =====================================================================
-- Storage bucket per als fitxers de TFG
-- =====================================================================
-- Estructura de paths: {user_id}/{submission_id}/{camp}/{filename}
-- Mida límit per fitxer: 100MB (es pot apujar a Supabase Dashboard si cal).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tfg-files',
  'tfg-files',
  false,  -- privat: l'accés es fa amb signed URLs
  104857600,  -- 100 MB
  NULL  -- tots els tipus de fitxer (els validem al client)
)
ON CONFLICT (id) DO NOTHING;

-- Polítiques del bucket: l'usuari només pot operar amb fitxers dins del seu prefix.
-- Path format: {user_id}/{submission_id}/...
-- (storage.foldername(name))[1] = user_id; cal coincidir amb auth.uid().
DROP POLICY IF EXISTS "Student manages own TFG files" ON storage.objects;
CREATE POLICY "Student manages own TFG files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'tfg-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_tfg_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'tfg-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_tfg_admin()
    )
  );
