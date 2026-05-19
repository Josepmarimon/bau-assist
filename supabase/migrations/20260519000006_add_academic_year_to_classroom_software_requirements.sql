-- Afegeix el camp `academic_year` a la vista classroom_software_requirements perquè
-- es pugui filtrar el software requerit a cada aula segons el curs acadèmic.
--
-- - Files amb origen 'subject' tenen el `academic_year` de subject_software.
-- - Files amb origen 'classroom' (software instal·lat permanent) tenen academic_year = NULL.

DROP VIEW IF EXISTS public.classroom_software_requirements;

CREATE VIEW public.classroom_software_requirements AS
WITH subject_required_software AS (
    SELECT DISTINCT
        c.id AS classroom_id,
        c.code AS classroom_code,
        c.name AS classroom_name,
        c.building,
        sw.id AS software_id,
        sw.name AS software_name,
        sw.version AS software_version,
        sw.license_type,
        sw.category,
        true AS is_required,
        'subject'::text AS source,
        ss.academic_year,
        string_agg(DISTINCT (s.code::text || ': '::text) || s.name::text, ', '::text
                   ORDER BY ((s.code::text || ': '::text) || s.name::text)) AS required_by_subjects
    FROM public.classrooms c
    JOIN public.assignment_classrooms ac ON ac.classroom_id = c.id
    JOIN public.assignments a ON a.id = ac.assignment_id
    JOIN public.subjects s ON s.id = a.subject_id
    JOIN public.subject_software ss ON ss.subject_id = s.id AND ss.is_required = true
    JOIN public.software sw ON sw.id = ss.software_id
    WHERE c.type::text = 'Informàtica'::text
      AND (ac.is_full_semester = true OR EXISTS (
          SELECT 1 FROM public.assignment_classroom_weeks acw
          WHERE acw.assignment_classroom_id = ac.id
      ))
    GROUP BY c.id, c.code, c.name, c.building, sw.id, sw.name, sw.version, sw.license_type, sw.category, ss.academic_year
),
classroom_installed_software AS (
    SELECT DISTINCT
        c.id AS classroom_id,
        c.code AS classroom_code,
        c.name AS classroom_name,
        c.building,
        sw.id AS software_id,
        sw.name AS software_name,
        sw.version AS software_version,
        sw.license_type,
        sw.category,
        true AS is_required,
        'classroom'::text AS source,
        NULL::character varying AS academic_year,
        NULL::text AS required_by_subjects
    FROM public.classrooms c
    JOIN public.classroom_software cs ON cs.classroom_id = c.id
    JOIN public.software sw ON sw.id = cs.software_id
    WHERE c.type::text = 'Informàtica'::text
),
combined_software AS (
    SELECT * FROM subject_required_software
    UNION ALL
    SELECT * FROM classroom_installed_software
)
SELECT DISTINCT
    classroom_id,
    classroom_code,
    classroom_name,
    building,
    software_id,
    software_name,
    software_version,
    license_type,
    COALESCE(category, 'general'::character varying) AS category,
    academic_year,
    true AS is_required,
    EXISTS (
        SELECT 1 FROM public.classroom_software cs
        WHERE cs.classroom_id = combined_software.classroom_id
          AND cs.software_id = combined_software.software_id
    ) AS is_installed,
    string_agg(DISTINCT required_by_subjects, ', '::text) FILTER (WHERE required_by_subjects IS NOT NULL) AS required_by_subjects,
    count(DISTINCT CASE WHEN source = 'subject'::text THEN 1 ELSE NULL::integer END) AS requiring_subject_count
FROM combined_software
GROUP BY classroom_id, classroom_code, classroom_name, building, software_id, software_name, software_version, license_type, category, academic_year
ORDER BY classroom_code, software_name;
