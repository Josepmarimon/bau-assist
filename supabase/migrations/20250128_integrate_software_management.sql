-- Fix table naming inconsistency: rename software_classrooms to classroom_software
ALTER TABLE IF EXISTS software_classrooms RENAME TO classroom_software;

-- Add missing columns if they don't exist
ALTER TABLE classroom_software 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unified view for license management
CREATE OR REPLACE VIEW software_license_summary AS
SELECT 
  s.id,
  s.name,
  s.version,
  s.license_type,
  s.license_quantity as total_licenses,
  s.license_cost,
  s.expiry_date,
  s.renewal_reminder_days,
  -- Total licenses assigned to classrooms
  COALESCE(SUM(cs.licenses), 0) as licenses_assigned,
  -- Available licenses (null for free/unlimited licenses)
  CASE 
    WHEN s.license_type IN ('free', 'open_source') THEN NULL
    WHEN s.license_quantity IS NOT NULL THEN s.license_quantity - COALESCE(SUM(cs.licenses), 0)
    ELSE NULL
  END as licenses_available,
  -- Classrooms where installed
  COUNT(DISTINCT cs.classroom_id) as classroom_count,
  -- Subjects that require this software
  COUNT(DISTINCT ss.subject_id) as subject_count,
  -- Programs that require this software
  COUNT(DISTINCT ps.program_id) as program_count,
  -- License status
  CASE
    WHEN s.expiry_date IS NULL THEN 'active'
    WHEN s.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN s.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(s.renewal_reminder_days, 30) THEN 'expiring_soon'
    ELSE 'active'
  END as license_status
FROM software s
LEFT JOIN classroom_software cs ON s.id = cs.software_id
LEFT JOIN subject_software ss ON s.id = ss.software_id
LEFT JOIN program_software ps ON s.id = ps.software_id
GROUP BY s.id;

-- Create view for software requirements by classroom
CREATE OR REPLACE VIEW classroom_software_requirements AS
WITH classroom_subjects AS (
  -- Get all subjects taught in each classroom
  SELECT DISTINCT
    ac.classroom_id,
    a.subject_id,
    s.code as subject_code,
    s.name as subject_name
  FROM assignment_classrooms ac
  JOIN assignments a ON ac.assignment_id = a.id
  JOIN subjects s ON a.subject_id = s.id
  WHERE ac.is_full_semester = true 
     OR EXISTS (
       SELECT 1 FROM assignment_classroom_weeks acw 
       WHERE acw.assignment_classroom_id = ac.id
     )
)
SELECT 
  c.id as classroom_id,
  c.code as classroom_code,
  c.name as classroom_name,
  c.building,
  sw.id as software_id,
  sw.name as software_name,
  sw.version as software_version,
  sw.license_type,
  -- Check if software is installed
  EXISTS (
    SELECT 1 FROM classroom_software cs 
    WHERE cs.classroom_id = c.id AND cs.software_id = sw.id
  ) as is_installed,
  -- Licenses in this classroom
  (
    SELECT cs.licenses FROM classroom_software cs 
    WHERE cs.classroom_id = c.id AND cs.software_id = sw.id
  ) as licenses_in_classroom,
  -- Subjects requiring this software
  STRING_AGG(DISTINCT cs_sub.subject_code || ': ' || cs_sub.subject_name, ', ' ORDER BY cs_sub.subject_code) as required_by_subjects,
  COUNT(DISTINCT cs_sub.subject_id) as requiring_subject_count,
  -- Is it required by any subject?
  MAX(ss.is_required::int) = 1 as is_required
FROM classrooms c
CROSS JOIN LATERAL (
  -- Get all software required by subjects in this classroom
  SELECT DISTINCT sw.*
  FROM classroom_subjects cs_sub
  JOIN subject_software ss ON cs_sub.subject_id = ss.subject_id
  JOIN software sw ON ss.software_id = sw.id
  WHERE cs_sub.classroom_id = c.id
) sw
LEFT JOIN classroom_subjects cs_sub ON cs_sub.classroom_id = c.id
LEFT JOIN subject_software ss ON ss.subject_id = cs_sub.subject_id AND ss.software_id = sw.id
WHERE c.type = 'informatica' -- Only computer classrooms
GROUP BY c.id, c.code, c.name, c.building, sw.id, sw.name, sw.version, sw.license_type;

-- Create function to automatically assign required software to classrooms
CREATE OR REPLACE FUNCTION assign_required_software_to_classroom(
  p_classroom_id UUID,
  p_override_licenses BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  software_id UUID,
  software_name TEXT,
  action TEXT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_software RECORD;
  v_existing_licenses INTEGER;
  v_required_licenses INTEGER DEFAULT 1;
  v_available_licenses INTEGER;
BEGIN
  -- Loop through all required software for this classroom
  FOR v_software IN 
    SELECT DISTINCT
      sr.software_id,
      sr.software_name,
      sr.license_type,
      sr.is_installed,
      sr.licenses_in_classroom,
      sl.total_licenses,
      sl.licenses_assigned,
      sl.licenses_available
    FROM classroom_software_requirements sr
    JOIN software_license_summary sl ON sr.software_id = sl.id
    WHERE sr.classroom_id = p_classroom_id
      AND sr.is_required = true
      AND sr.is_installed = false
  LOOP
    -- Check if we have available licenses
    IF v_software.license_type NOT IN ('free', 'open_source') AND 
       v_software.licenses_available IS NOT NULL AND 
       v_software.licenses_available < v_required_licenses AND
       NOT p_override_licenses THEN
      
      RETURN QUERY
      SELECT 
        v_software.software_id,
        v_software.software_name,
        'skipped'::TEXT,
        FALSE,
        format('No hi ha suficients llicències disponibles (%s de %s)', 
               v_software.licenses_available, v_required_licenses)::TEXT;
      
      CONTINUE;
    END IF;
    
    -- Try to assign the software
    BEGIN
      INSERT INTO classroom_software (software_id, classroom_id, licenses, installed_date)
      VALUES (v_software.software_id, p_classroom_id, v_required_licenses, CURRENT_DATE);
      
      RETURN QUERY
      SELECT 
        v_software.software_id,
        v_software.software_name,
        'assigned'::TEXT,
        TRUE,
        'Software assignat correctament'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        v_software.software_id,
        v_software.software_name,
        'error'::TEXT,
        FALSE,
        SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to check license availability before assignment
CREATE OR REPLACE FUNCTION check_software_license_availability(
  p_software_id UUID,
  p_requested_licenses INTEGER
) RETURNS TABLE (
  can_assign BOOLEAN,
  available_licenses INTEGER,
  message TEXT
) AS $$
DECLARE
  v_software RECORD;
BEGIN
  SELECT * INTO v_software
  FROM software_license_summary
  WHERE id = p_software_id;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 0, 'Software no trobat'::TEXT;
    RETURN;
  END IF;
  
  -- Free or open source software always available
  IF v_software.license_type IN ('free', 'open_source') THEN
    RETURN QUERY
    SELECT TRUE, NULL::INTEGER, 'Software gratuït - llicències il·limitades'::TEXT;
    RETURN;
  END IF;
  
  -- Check if we have license quantity defined
  IF v_software.total_licenses IS NULL THEN
    RETURN QUERY
    SELECT TRUE, NULL::INTEGER, 'No hi ha límit de llicències definit'::TEXT;
    RETURN;
  END IF;
  
  -- Check availability
  IF v_software.licenses_available >= p_requested_licenses THEN
    RETURN QUERY
    SELECT 
      TRUE, 
      v_software.licenses_available::INTEGER, 
      format('%s llicències disponibles', v_software.licenses_available)::TEXT;
  ELSE
    RETURN QUERY
    SELECT 
      FALSE, 
      v_software.licenses_available::INTEGER, 
      format('Només %s llicències disponibles de %s sol·licitades', 
             v_software.licenses_available, p_requested_licenses)::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate license availability on insert/update
CREATE OR REPLACE FUNCTION validate_classroom_software_licenses()
RETURNS TRIGGER AS $$
DECLARE
  v_check RECORD;
BEGIN
  -- Skip validation for free/open source software
  SELECT license_type INTO v_check
  FROM software
  WHERE id = NEW.software_id;
  
  IF v_check.license_type IN ('free', 'open_source') THEN
    RETURN NEW;
  END IF;
  
  -- Check availability
  SELECT * INTO v_check
  FROM check_software_license_availability(NEW.software_id, NEW.licenses);
  
  IF NOT v_check.can_assign THEN
    RAISE EXCEPTION 'No es poden assignar % llicències: %', NEW.licenses, v_check.message;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_licenses_trigger ON classroom_software;
CREATE TRIGGER validate_licenses_trigger
BEFORE INSERT OR UPDATE ON classroom_software
FOR EACH ROW
EXECUTE FUNCTION validate_classroom_software_licenses();

-- Update existing view to use correct table name
DROP VIEW IF EXISTS software_with_classrooms CASCADE;
CREATE VIEW software_with_classrooms AS
SELECT 
  s.*,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'classroom_id', c.id,
        'classroom_name', c.name,
        'classroom_code', c.code,
        'licenses', cs.licenses
      )
    ) FILTER (WHERE c.id IS NOT NULL), 
    '[]'::json
  ) AS classrooms,
  COUNT(DISTINCT c.id) AS classroom_count
FROM software s
LEFT JOIN classroom_software cs ON s.id = cs.software_id
LEFT JOIN classrooms c ON cs.classroom_id = c.id
GROUP BY s.id;

-- Add RLS policies
ALTER TABLE classroom_software ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public can view classroom software" ON classroom_software
  FOR SELECT TO public USING (true);

-- Only authenticated users can modify
CREATE POLICY "Authenticated users can manage classroom software" ON classroom_software
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_classroom_software_updated_at 
BEFORE UPDATE ON classroom_software
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classroom_software_software_id ON classroom_software(software_id);
CREATE INDEX IF NOT EXISTS idx_classroom_software_classroom_id ON classroom_software(classroom_id);
CREATE INDEX IF NOT EXISTS idx_subject_software_software_id ON subject_software(software_id);
CREATE INDEX IF NOT EXISTS idx_subject_software_subject_id ON subject_software(subject_id);