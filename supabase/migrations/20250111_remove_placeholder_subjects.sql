-- Remove placeholder subject groups that were incorrectly imported
-- These are generic placeholders that appear for ALL groups (M1, M2, M3, M4, M5, T1, T2)
-- but don't have real classroom assignments

-- First, let's identify and remove subject groups for "Expressió Gràfica I" and "Expressió Gràfica II"
-- that don't have classroom assignments (these are the placeholders)
DELETE FROM subject_groups
WHERE subject_id IN (
  SELECT id FROM subjects 
  WHERE (
    LOWER(name) LIKE '%expressió gràfica i%' OR
    LOWER(name) LIKE '%expressio grafica i%' OR
    LOWER(name) LIKE '%expressió gràfica ii%' OR
    LOWER(name) LIKE '%expressio grafica ii%'
  )
)
AND id NOT IN (
  -- Keep only subject groups that have actual classroom assignments
  SELECT DISTINCT subject_group_id 
  FROM assignments 
  WHERE subject_group_id IS NOT NULL
  AND classroom_id IS NOT NULL
);

-- Remove placeholder subject groups for "Iniciació als Projectes de Disseny I" and "II"
DELETE FROM subject_groups
WHERE subject_id IN (
  SELECT id FROM subjects 
  WHERE (
    LOWER(name) LIKE '%iniciació als projectes%' OR
    LOWER(name) LIKE '%iniciacio als projectes%' OR
    LOWER(name) LIKE '%projectes de disseny i%' OR
    LOWER(name) LIKE '%projectes de disseny ii%'
  )
  AND year <= 2  -- These placeholders are typically in 1st and 2nd year
)
AND id NOT IN (
  -- Keep only subject groups that have actual classroom assignments
  SELECT DISTINCT subject_group_id 
  FROM assignments 
  WHERE subject_group_id IS NOT NULL
  AND classroom_id IS NOT NULL
);

-- Also remove any other subject groups that appear in ALL basic groups (M1-M5, T1-T2)
-- without real assignments
WITH placeholder_groups AS (
  SELECT sg.subject_id, COUNT(DISTINCT sg.group_code) as group_count
  FROM subject_groups sg
  WHERE sg.group_code IN ('M1', 'M2', 'M3', 'M4', 'M5', 'T1', 'T2')
  AND sg.id NOT IN (
    SELECT DISTINCT subject_group_id 
    FROM assignments 
    WHERE subject_group_id IS NOT NULL
    AND classroom_id IS NOT NULL
  )
  GROUP BY sg.subject_id
  HAVING COUNT(DISTINCT sg.group_code) >= 7  -- Appears in all or almost all basic groups
)
DELETE FROM subject_groups
WHERE subject_id IN (SELECT subject_id FROM placeholder_groups)
AND id NOT IN (
  SELECT DISTINCT subject_group_id 
  FROM assignments 
  WHERE subject_group_id IS NOT NULL
  AND classroom_id IS NOT NULL
);

-- Clean up any orphaned subjects that no longer have any groups
DELETE FROM subjects
WHERE id NOT IN (
  SELECT DISTINCT subject_id 
  FROM subject_groups
  WHERE subject_id IS NOT NULL
)
AND id IN (
  -- Only delete if they match the placeholder patterns
  SELECT id FROM subjects 
  WHERE (
    LOWER(name) LIKE '%expressió gràfica%' OR
    LOWER(name) LIKE '%expressio grafica%' OR
    LOWER(name) LIKE '%iniciació als projectes%' OR
    LOWER(name) LIKE '%iniciacio als projectes%'
  )
  AND year <= 2
);