-- Clear all existing itinerari values to start fresh
UPDATE subjects SET itinerari = NULL;

-- Set the correct itineraris based on the 4 real tracks used at BAU

-- Disseny Gràfic (Graphic Design)
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE (
  code LIKE 'GR%' OR
  LOWER(name) LIKE '%gràfic%' OR
  LOWER(name) LIKE '%grafic%' OR
  LOWER(name) LIKE '%tipograf%' OR
  LOWER(name) LIKE '%editorial%' OR
  LOWER(name) LIKE '%branding%' OR
  LOWER(name) LIKE '%identitat%' OR
  LOWER(name) LIKE '%cartell%' OR
  LOWER(name) LIKE '%packaging%' OR
  LOWER(name) LIKE '%disseny visual%'
) AND year IN (3, 4);

-- Audiovisual
UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE (
  code LIKE 'AV%' OR
  LOWER(name) LIKE '%audiovisual%' OR
  LOWER(name) LIKE '%video%' OR
  LOWER(name) LIKE '%vídeo%' OR
  LOWER(name) LIKE '%cinema%' OR
  LOWER(name) LIKE '%film%' OR
  LOWER(name) LIKE '%muntatge%' OR
  LOWER(name) LIKE '%edició%' OR
  LOWER(name) LIKE '%realitzaci%' OR
  LOWER(name) LIKE '%documental%' OR
  LOWER(name) LIKE '%guió%'
) AND year IN (3, 4);

-- Moda (Fashion)
UPDATE subjects 
SET itinerari = 'Moda'
WHERE (
  code LIKE 'MO%' OR
  LOWER(name) LIKE '%moda%' OR
  LOWER(name) LIKE '%fashion%' OR
  LOWER(name) LIKE '%tèxtil%' OR
  LOWER(name) LIKE '%textil%' OR
  LOWER(name) LIKE '%patronatge%' OR
  LOWER(name) LIKE '%confecció%' OR
  LOWER(name) LIKE '%vestit%' OR
  LOWER(name) LIKE '%costura%'
) AND year IN (3, 4);

-- Interiors
UPDATE subjects 
SET itinerari = 'Interiors'
WHERE (
  code LIKE 'IN%' OR
  LOWER(name) LIKE '%interior%' OR
  LOWER(name) LIKE '%espai%' OR
  LOWER(name) LIKE '%retail%' OR
  LOWER(name) LIKE '%efímer%' OR
  LOWER(name) LIKE '%mobiliari%' OR
  LOWER(name) LIKE '%il·luminació%' OR
  LOWER(name) LIKE '%escenograf%'
) AND year IN (3, 4);

-- Some 2nd year subjects might also have itineraris if they are specialized
UPDATE subjects 
SET itinerari = 'Gràfic'
WHERE code LIKE 'GR%' AND year = 2;

UPDATE subjects 
SET itinerari = 'Audiovisual'
WHERE code LIKE 'AV%' AND year = 2;

UPDATE subjects 
SET itinerari = 'Moda'
WHERE code LIKE 'MO%' AND year = 2;

UPDATE subjects 
SET itinerari = 'Interiors'
WHERE code LIKE 'IN%' AND year = 2;

-- Note: Only 4 real itineraris at BAU:
-- 1. Gràfic (with groups Gm1, Gm2, Gt)
-- 2. Audiovisual (with groups Am, At)
-- 3. Moda (with groups Mm, Mt)
-- 4. Interiors (with groups Im, It)