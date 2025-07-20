-- Fix incorrect "Web" itinerary values
-- There should only be 4 itineraries: Gràfic, Audiovisual, Moda, and Interiors

-- First, let's see what subjects currently have "Web" as itinerary
-- Animation subjects should be under "Audiovisual"
UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE itinerari = 'Web' 
AND (
  LOWER(name) LIKE '%animació%' OR
  LOWER(name) LIKE '%animacio%' OR
  LOWER(name) LIKE '%animation%'
);

-- Web design and digital creation subjects should be under "Gràfic"
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE itinerari = 'Web' 
AND (
  LOWER(name) LIKE '%web%' OR
  LOWER(name) LIKE '%digital%' OR
  LOWER(name) LIKE '%autoria%'
);

-- Also fix "Tipografia" which is not a valid itinerary
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE itinerari = 'Tipografia';

-- Fix any other invalid itineraries by setting them to NULL
UPDATE subjects 
SET itinerari = NULL
WHERE itinerari IS NOT NULL 
AND itinerari NOT IN ('Gràfic', 'Audiovisual', 'Moda', 'Interiors');

-- Log the valid itineraries for reference
-- Valid itineraries at BAU:
-- 1. Gràfic (Graphic Design)
-- 2. Audiovisual 
-- 3. Moda (Fashion)
-- 4. Interiors