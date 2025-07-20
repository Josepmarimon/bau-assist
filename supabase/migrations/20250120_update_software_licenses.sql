-- Add new columns to software table for license management
ALTER TABLE software 
ADD COLUMN IF NOT EXISTS license_model VARCHAR(50) DEFAULT 'installed',
ADD COLUMN IF NOT EXISTS license_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS license_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_renewal_date DATE,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS provider_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS provider_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add check constraint for license_model
ALTER TABLE software 
ADD CONSTRAINT software_license_model_check 
CHECK (license_model IN ('installed', 'floating', 'pay_per_use'));

-- Create index for expiry date to optimize queries for expiring licenses
CREATE INDEX IF NOT EXISTS idx_software_expiry_date ON software(expiry_date);

-- Create a view for licenses expiring soon
CREATE OR REPLACE VIEW expiring_licenses AS
SELECT 
  id,
  name,
  version,
  license_type,
  license_model,
  license_quantity,
  license_cost,
  expiry_date,
  last_renewal_date,
  provider_name,
  provider_email,
  provider_phone,
  renewal_reminder_days,
  CASE 
    WHEN expiry_date IS NULL THEN 'no_expiry'
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date <= CURRENT_DATE + INTERVAL '1 day' * renewal_reminder_days THEN 'expiring_soon'
    ELSE 'active'
  END as status,
  CASE 
    WHEN expiry_date IS NOT NULL THEN 
      expiry_date - CURRENT_DATE 
    ELSE NULL
  END as days_until_expiry
FROM software
WHERE license_type != 'free'
ORDER BY expiry_date ASC;

-- Create a function to get licenses requiring attention
CREATE OR REPLACE FUNCTION get_licenses_requiring_attention()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  version VARCHAR,
  expiry_date DATE,
  days_until_expiry INTEGER,
  status TEXT,
  provider_name VARCHAR,
  provider_email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.version,
    s.expiry_date,
    CASE 
      WHEN s.expiry_date IS NOT NULL THEN 
        (s.expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_expiry,
    CASE 
      WHEN s.expiry_date IS NULL THEN 'no_expiry'
      WHEN s.expiry_date < CURRENT_DATE THEN 'expired'
      WHEN s.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * s.renewal_reminder_days THEN 'expiring_soon'
      ELSE 'active'
    END as status,
    s.provider_name,
    s.provider_email
  FROM software s
  WHERE s.license_type != 'free'
    AND s.expiry_date IS NOT NULL
    AND (s.expiry_date < CURRENT_DATE 
         OR s.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * s.renewal_reminder_days)
  ORDER BY s.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for the new columns
-- (The existing policies should already cover these as they're part of the same table)

-- Add comments for documentation
COMMENT ON COLUMN software.license_model IS 'Type of license: installed, floating, or pay_per_use';
COMMENT ON COLUMN software.license_quantity IS 'Number of licenses purchased';
COMMENT ON COLUMN software.license_cost IS 'Cost per license';
COMMENT ON COLUMN software.last_renewal_date IS 'Date when the license was last renewed';
COMMENT ON COLUMN software.expiry_date IS 'Date when the license expires';
COMMENT ON COLUMN software.renewal_reminder_days IS 'Days before expiry to show reminder';
COMMENT ON COLUMN software.provider_name IS 'Name of the license provider company';
COMMENT ON COLUMN software.provider_email IS 'Contact email for the license provider';
COMMENT ON COLUMN software.provider_phone IS 'Contact phone for the license provider';
COMMENT ON COLUMN software.notes IS 'Additional notes about the software or license';