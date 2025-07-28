-- Add license_url column to software table
ALTER TABLE software 
ADD COLUMN IF NOT EXISTS license_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN software.license_url IS 'URL for downloading or managing licenses';

-- Update the expiring_licenses view to include license_url
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
  license_url,
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