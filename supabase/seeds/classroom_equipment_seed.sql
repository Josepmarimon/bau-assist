-- Seed data for classroom equipment

-- First, let's get some classroom IDs from public classrooms
WITH public_classrooms AS (
    SELECT id, code, type FROM classrooms WHERE is_public = true LIMIT 10
),
equipment_assignments AS (
    -- Assign projectors to most classrooms
    SELECT 
        pc.id as classroom_id,
        et.id as equipment_type_id,
        1 as quantity,
        'good' as condition,
        NULL as notes
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code IN ('PROJ_HD', 'PROJ_4K')
    AND pc.type IN ('aula', 'teorica', 'seminari', 'polivalent')
    
    UNION ALL
    
    -- Assign interactive screens to some classrooms
    SELECT 
        pc.id,
        et.id,
        1,
        'excellent',
        'Pantalla tàctil de 75 polzades'
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code = 'SCREEN_INT'
    AND pc.type IN ('seminari', 'projectes')
    
    UNION ALL
    
    -- Assign Wacom tablets to workshop classrooms
    SELECT 
        pc.id,
        et.id,
        CASE 
            WHEN et.code = 'WACOM_CTL' THEN 15
            WHEN et.code = 'WACOM_CTM' THEN 10
        END,
        'good',
        'Tauletes gràfiques per a disseny'
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code IN ('WACOM_CTL', 'WACOM_CTM')
    AND pc.type = 'taller'
    
    UNION ALL
    
    -- Assign 3D printers and laser cutters to some workshops
    SELECT 
        pc.id,
        et.id,
        CASE 
            WHEN et.code = '3D_PRINTER' THEN 2
            WHEN et.code = 'LASER_CUT' THEN 1
        END,
        'good',
        NULL
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code IN ('3D_PRINTER', 'LASER_CUT')
    AND pc.type = 'taller'
    
    UNION ALL
    
    -- Assign photography equipment to some classrooms
    SELECT 
        pc.id,
        et.id,
        CASE 
            WHEN et.code = 'CAMERA_DSLR' THEN 5
            WHEN et.code = 'LIGHTING_STD' THEN 2
        END,
        'excellent',
        'Equipament de fotografia professional'
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code IN ('CAMERA_DSLR', 'LIGHTING_STD')
    AND pc.type IN ('taller', 'projectes')
    
    UNION ALL
    
    -- Assign sound equipment to some classrooms
    SELECT 
        pc.id,
        et.id,
        1,
        'good',
        'Mesa de mescles digital de 16 canals'
    FROM public_classrooms pc
    CROSS JOIN equipment_types et
    WHERE et.code = 'SOUND_MIX'
    AND pc.type IN ('taller', 'polivalent')
)
-- Insert the equipment assignments, avoiding duplicates
INSERT INTO classroom_equipment (classroom_id, equipment_type_id, quantity, condition, notes)
SELECT DISTINCT ON (classroom_id, equipment_type_id) 
    classroom_id, 
    equipment_type_id, 
    quantity, 
    condition, 
    notes
FROM equipment_assignments
ON CONFLICT (classroom_id, equipment_type_id) DO UPDATE
SET 
    quantity = EXCLUDED.quantity,
    condition = EXCLUDED.condition,
    notes = EXCLUDED.notes,
    updated_at = NOW();