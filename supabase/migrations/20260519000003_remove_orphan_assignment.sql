-- Elimina un assignment orphan trobat al 25-26 sem.2:
--   assignment id 225490b2-3aba-44b4-9b12-d1d5bd13f05e
-- Apuntava a un subject_group del 24-25 sem.2 (GDB032 "Història del Disseny", grup GR2-M5)
-- que no té equivalent al 25-26 (els grups oferts són M3, M4, T1).
--
-- Probablement és residu d'una migració de curs incompleta. La professora afectada era
-- "Nataly Dal Pozzo Montrucchio". Si l'assignació era vigent, caldrà recrear-la apuntant
-- al subject_group correcte del 25-26.

BEGIN;

DELETE FROM public.assignment_classrooms
WHERE assignment_id = '225490b2-3aba-44b4-9b12-d1d5bd13f05e';

DELETE FROM public.assignments
WHERE id = '225490b2-3aba-44b4-9b12-d1d5bd13f05e';

COMMIT;
