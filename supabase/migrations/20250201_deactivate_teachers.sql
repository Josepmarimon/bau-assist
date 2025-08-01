-- Deactivate teachers who no longer work at BAU
-- These teachers will be kept in the database for historical records
-- but won't appear in active teacher lists

UPDATE teachers 
SET 
    is_active = false,
    updated_at = NOW()
WHERE id_profe IN (
    '651', -- Mario Santamaría
    '598', -- Ariadna Guiteras
    '607', -- Paula Bruna
    '609', -- Lucía Segurajáuregui
    '453', -- Anna Carreras
    '377', -- Mariona García
    '556', -- David Ortiz
    '411', -- Sílvia Rosés
    '594', -- Mariona Ribas
    '564', -- Monica Rikic
    '569', -- Citlaly Hernandez
    '673', -- Alex Valverde
    '650', -- Marina Riera
    '756', -- Èlida Pérez
    '759'  -- Carmen Platero
);

-- Log the deactivation
DO $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deactivated_count
    FROM teachers 
    WHERE id_profe IN ('651','598','607','609','453','377','556','411','594','564','569','673','650','756','759')
    AND is_active = false;
    
    RAISE NOTICE 'Deactivated % teachers', deactivated_count;
END $$;