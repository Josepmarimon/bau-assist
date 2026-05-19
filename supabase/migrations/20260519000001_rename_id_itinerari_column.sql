-- Renombrar la columna "ID Itinerari" (amb espai i majúscules) a itinerary_code (snake_case).
-- La columna conté codis d'itinerari (A, G, I, M) per a les assignatures del Grau en Disseny.

ALTER TABLE public.subjects RENAME COLUMN "ID Itinerari" TO itinerary_code;
