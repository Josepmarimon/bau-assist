-- Crear el curs acadèmic 2026-2027 i els seus dos semestres.
-- No es marca com a current per no canviar l'any actiu fins que es decideixi.

INSERT INTO public.academic_years (name, start_date, end_date, is_current)
VALUES ('2026-2027', '2026-09-01', '2027-07-31', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.semesters (academic_year_id, name, number, start_date, end_date)
SELECT
  ay.id,
  s.name,
  s.number,
  s.start_date::date,
  s.end_date::date
FROM public.academic_years ay
CROSS JOIN (
  VALUES
    ('Primer Semestre 2026-2027', 1, '2026-09-15', '2027-01-31'),
    ('Segon Semestre 2026-2027', 2, '2027-02-01', '2027-06-30')
) AS s(name, number, start_date, end_date)
WHERE ay.name = '2026-2027'
  AND NOT EXISTS (
    SELECT 1 FROM public.semesters
    WHERE academic_year_id = ay.id AND number = s.number
  );
