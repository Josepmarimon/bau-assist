-- Update subjects with itinerari based on their characteristics
-- This is based on common patterns in subject names and codes

-- Videojocs (Videogames)
UPDATE subjects 
SET itinerari = 'Videojocs'
WHERE (
  LOWER(name) LIKE '%videojoc%' OR
  LOWER(name) LIKE '%game%' OR
  LOWER(name) LIKE '%joc%' OR
  LOWER(name) LIKE '%unity%' OR
  LOWER(name) LIKE '%unreal%' OR
  LOWER(name) LIKE '%3d%' OR
  LOWER(name) LIKE '%modelat%'
) AND itinerari IS NULL;

-- Animació (Animation)
UPDATE subjects 
SET itinerari = 'Animació'
WHERE (
  LOWER(name) LIKE '%animaci%' OR
  LOWER(name) LIKE '%motion%' OR
  LOWER(name) LIKE '%character%' OR
  LOWER(name) LIKE '%rigging%' OR
  LOWER(name) LIKE '%storyboard%'
) AND itinerari IS NULL;

-- Disseny Gràfic (Graphic Design)
UPDATE subjects 
SET itinerari = 'Disseny Gràfic'
WHERE (
  LOWER(name) LIKE '%gràfic%' OR
  LOWER(name) LIKE '%grafic%' OR
  LOWER(name) LIKE '%tipograf%' OR
  LOWER(name) LIKE '%editorial%' OR
  LOWER(name) LIKE '%branding%' OR
  LOWER(name) LIKE '%identitat%' OR
  LOWER(name) LIKE '%cartell%'
) AND itinerari IS NULL;

-- Audiovisual
UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE (
  LOWER(name) LIKE '%audiovisual%' OR
  LOWER(name) LIKE '%video%' OR
  LOWER(name) LIKE '%vídeo%' OR
  LOWER(name) LIKE '%cinema%' OR
  LOWER(name) LIKE '%film%' OR
  LOWER(name) LIKE '%muntatge%' OR
  LOWER(name) LIKE '%edició%' OR
  LOWER(name) LIKE '%realitzaci%'
) AND itinerari IS NULL;

-- Moda (Fashion)
UPDATE subjects 
SET itinerari = 'Moda'
WHERE (
  LOWER(name) LIKE '%moda%' OR
  LOWER(name) LIKE '%fashion%' OR
  LOWER(name) LIKE '%tèxtil%' OR
  LOWER(name) LIKE '%textil%' OR
  LOWER(name) LIKE '%patronatge%' OR
  LOWER(name) LIKE '%confecció%'
) AND itinerari IS NULL;

-- Interiors
UPDATE subjects 
SET itinerari = 'Interiors'
WHERE (
  LOWER(name) LIKE '%interior%' OR
  LOWER(name) LIKE '%espai%' OR
  LOWER(name) LIKE '%arquitect%' OR
  LOWER(name) LIKE '%mobiliari%' OR
  LOWER(name) LIKE '%retail%' OR
  LOWER(name) LIKE '%efímer%'
) AND itinerari IS NULL;

-- Producte (Product Design)
UPDATE subjects 
SET itinerari = 'Producte'
WHERE (
  LOWER(name) LIKE '%producte%' OR
  LOWER(name) LIKE '%product%' OR
  LOWER(name) LIKE '%industrial%' OR
  LOWER(name) LIKE '%packaging%' OR
  LOWER(name) LIKE '%envàs%' OR
  LOWER(name) LIKE '%embalatge%'
) AND itinerari IS NULL;

-- For subjects in years 3 and 4 that don't match any specific itinerari,
-- we can try to infer from the subject code patterns
UPDATE subjects
SET itinerari = CASE
  -- Based on common subject code patterns
  WHEN code LIKE 'VJ%' THEN 'Videojocs'
  WHEN code LIKE 'AN%' THEN 'Animació'
  WHEN code LIKE 'GR%' THEN 'Disseny Gràfic'
  WHEN code LIKE 'AV%' THEN 'Audiovisual'
  WHEN code LIKE 'MO%' THEN 'Moda'
  WHEN code LIKE 'IN%' THEN 'Interiors'
  WHEN code LIKE 'PR%' THEN 'Producte'
  ELSE itinerari
END
WHERE year IN (3, 4) AND itinerari IS NULL;

-- Common subjects for all itineraris (1st and 2nd year) should remain NULL
-- as they are not specific to any itinerari