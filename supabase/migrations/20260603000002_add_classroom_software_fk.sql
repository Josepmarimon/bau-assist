-- Afegeix la FK que falta de classroom_software.software_id -> software.id.
-- Sense aquesta FK, PostgREST no pot resoldre el join niat `software:software(...)`
-- que fa la fitxa pública d'aula, i el software instal·lat no es mostra.

ALTER TABLE classroom_software
  ADD CONSTRAINT classroom_software_software_id_fkey
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE;
