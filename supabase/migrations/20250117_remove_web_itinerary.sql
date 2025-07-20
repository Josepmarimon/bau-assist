-- Fix itinerary issues - BAU only has 4 valid itineraries
-- Schedule names: Disseny Gràfic, Disseny Audiovisuals, Disseny de Moda, Disseny d'Espais
-- Database names (shortened): Gràfic, Audiovisual, Moda, Interiors

-- First, normalize Audiovisuals to Audiovisual (remove the 's')
UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE itinerari = 'Audiovisuals';

-- Update animation subjects (currently marked as Web) to Audiovisual
UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE itinerari = 'Web' 
  AND (name ILIKE '%animació%' OR name ILIKE '%animacion%');

-- Update web design and digital creation subjects to Gràfic
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE itinerari = 'Web' 
  AND (name ILIKE '%web%' OR name ILIKE '%digital%' OR name ILIKE '%creació%');

-- Fix any remaining Tipografia itinerary to Gràfic
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE itinerari = 'Tipografia';

-- Clear any other invalid itineraries (including Web)
UPDATE subjects 
SET itinerari = NULL
WHERE itinerari NOT IN ('Gràfic', 'Audiovisual', 'Moda', 'Interiors');