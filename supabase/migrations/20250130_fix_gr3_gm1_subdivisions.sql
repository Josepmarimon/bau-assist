-- First check if there are any assignments for GR3-Gm1a and GR3-Gm1b
-- If there are, we need to handle them before deleting the groups

-- Delete any assignments for GR3-Gm1a and GR3-Gm1b
DELETE FROM assignments 
WHERE subject_group_id IN (
  SELECT id FROM subject_groups 
  WHERE group_code IN ('GR3-Gm1a', 'GR3-Gm1b')
);

-- Get the subject_id and semester_id from one of the groups we're removing
DO $$
DECLARE
  v_subject_id uuid;
  v_semester_id uuid;
  v_existing_gm1_id uuid;
BEGIN
  -- Get the subject and semester from one of the groups we're removing
  SELECT subject_id, semester_id INTO v_subject_id, v_semester_id
  FROM subject_groups
  WHERE group_code = 'GR3-Gm1a'
  LIMIT 1;
  
  -- Check if GR3-Gm1 already exists for this subject
  SELECT id INTO v_existing_gm1_id
  FROM subject_groups
  WHERE subject_id = v_subject_id 
    AND semester_id = v_semester_id
    AND group_code = 'GR3-Gm1';
  
  -- If GR3-Gm1 doesn't exist for this subject, create it
  IF v_existing_gm1_id IS NULL THEN
    INSERT INTO subject_groups (subject_id, semester_id, group_code, max_students)
    VALUES (v_subject_id, v_semester_id, 'GR3-Gm1', 25);
  END IF;
END $$;

-- Now delete the subdivided groups
DELETE FROM subject_groups 
WHERE group_code IN ('GR3-Gm1a', 'GR3-Gm1b');

-- Log what we did
DO $$
DECLARE
  v_subject_name text;
BEGIN
  SELECT name INTO v_subject_name
  FROM subjects
  WHERE id = (
    SELECT DISTINCT subject_id 
    FROM subject_groups 
    WHERE group_code = 'GR3-Gm1' 
    AND subject_id IN (
      SELECT id FROM subjects WHERE code = 'GDVG13'
    )
    LIMIT 1
  );
  
  RAISE NOTICE 'Removed GR3-Gm1a and GR3-Gm1b subdivisions for subject: %', COALESCE(v_subject_name, 'GDVG13');
END $$;