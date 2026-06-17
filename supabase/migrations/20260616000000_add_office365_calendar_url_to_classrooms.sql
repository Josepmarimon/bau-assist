-- Add an Office 365 published-calendar embed URL per classroom.
-- This replaces the custom in-app occupancy calendar on the public classroom fiche
-- with an embedded Office 365 calendar (one published calendar URL per aula).
ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS office365_calendar_url text;

COMMENT ON COLUMN classrooms.office365_calendar_url IS
  'URL pública del calendari publicat d''Office 365 (calendar.html) per embeure a la fitxa pública de l''aula.';
