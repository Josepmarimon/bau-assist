-- Sample Masters Programs Seed Data

-- Insert sample masters programs
INSERT INTO programs (code, name, type, credits, duration_years, coordinator_name, coordinator_email, department, description, active)
VALUES 
    ('MUD', 'Màster Universitari en Disseny', 'master', 60, 1, 'Dr. Maria Garcia', 'mgarcia@bau.edu', 'Disseny', 'Màster oficial en disseny amb especialitzacions en disseny gràfic, producte i espais', true),
    ('MUDAT', 'Màster en Disseny i Art Digital', 'master', 60, 1, 'Dr. Joan Puig', 'jpuig@bau.edu', 'Arts Digitals', 'Formació avançada en art digital, realitat virtual i instal·lacions interactives', true),
    ('MUDG', 'Màster en Disseny Gràfic i Projectes Editorials', 'master', 60, 1, 'Dra. Anna Martí', 'amarti@bau.edu', 'Disseny Gràfic', 'Especialització en disseny editorial, tipografia i comunicació visual', true),
    ('PGDM', 'Postgrau en Disseny de Mobiliari', 'postgrau', 30, 0.5, 'Prof. Pere Soler', 'psoler@bau.edu', 'Disseny Industrial', 'Formació especialitzada en disseny de mobiliari contemporani', true),
    ('PGUX', 'Postgrau en UX/UI Design', 'postgrau', 30, 0.5, 'Prof. Laura Vidal', 'lvidal@bau.edu', 'Disseny Digital', 'Especialització en disseny d''experiència d''usuari i interfícies', true)
ON CONFLICT (code) DO NOTHING;

-- Create sample subjects for masters
INSERT INTO subjects (code, name, credits, year, type, department, description, program_level, term_type, term_number)
VALUES 
    -- Màster Universitari en Disseny (MUD)
    ('MUD101', 'Teoria i Crítica del Disseny Contemporani', 6, 1, 'OBLIGATORIA', 'Disseny', 'Anàlisi crític de les tendències actuals en disseny', 'master', 'semester', 1),
    ('MUD102', 'Metodologies de Recerca en Disseny', 6, 1, 'OBLIGATORIA', 'Disseny', 'Mètodes de recerca aplicats al disseny', 'master', 'semester', 1),
    ('MUD103', 'Innovació i Sostenibilitat', 6, 1, 'OBLIGATORIA', 'Disseny', 'Disseny sostenible i economia circular', 'master', 'semester', 1),
    ('MUD201', 'Projecte de Disseny Avançat', 9, 1, 'OBLIGATORIA', 'Disseny', 'Desenvolupament de projecte integral', 'master', 'semester', 2),
    ('MUD202', 'Seminari d''Especialització', 3, 1, 'OPTATIVA', 'Disseny', 'Seminaris temàtics segons especialitat', 'master', 'semester', 2),
    ('MUD300', 'Treball Final de Màster', 12, 1, 'TFM', 'Disseny', 'Projecte final de màster', 'master', 'semester', 2),
    
    -- Màster en Disseny i Art Digital (MUDAT)
    ('MUDAT101', 'Art Digital i Nous Mitjans', 6, 1, 'OBLIGATORIA', 'Arts Digitals', 'Exploració de mitjans digitals en l''art', 'master', 'semester', 1),
    ('MUDAT102', 'Programació Creativa', 6, 1, 'OBLIGATORIA', 'Arts Digitals', 'Processing, p5.js i altres eines', 'master', 'semester', 1),
    ('MUDAT103', 'Realitat Virtual i Augmentada', 6, 1, 'OBLIGATORIA', 'Arts Digitals', 'Creació d''experiències immersives', 'master', 'semester', 1),
    ('MUDAT201', 'Instal·lacions Interactives', 9, 1, 'OBLIGATORIA', 'Arts Digitals', 'Disseny i implementació d''instal·lacions', 'master', 'semester', 2),
    ('MUDAT300', 'Projecte Final d''Art Digital', 15, 1, 'TFM', 'Arts Digitals', 'Obra o instal·lació final', 'master', 'semester', 2),
    
    -- Postgrau en Disseny de Mobiliari (PGDM)
    ('PGDM01', 'Materials i Processos', 6, 1, 'OBLIGATORIA', 'Disseny Industrial', 'Materials contemporanis en mobiliari', 'postgrau', 'trimester', 1),
    ('PGDM02', 'Ergonomia i Funció', 6, 1, 'OBLIGATORIA', 'Disseny Industrial', 'Disseny centrat en l''usuari', 'postgrau', 'trimester', 1),
    ('PGDM03', 'Prototipatge i Fabricació', 6, 1, 'OBLIGATORIA', 'Disseny Industrial', 'Tècniques de prototipatge ràpid', 'postgrau', 'trimester', 2),
    ('PGDM04', 'Projecte de Mobiliari', 12, 1, 'OBLIGATORIA', 'Disseny Industrial', 'Desenvolupament de col·lecció', 'postgrau', 'trimester', 2)
ON CONFLICT (code) DO NOTHING;

-- Link subjects to programs
INSERT INTO program_subjects (program_id, subject_id, year, semester, is_mandatory, specialization)
SELECT 
    p.id as program_id,
    s.id as subject_id,
    s.year,
    s.term_number as semester,
    CASE WHEN s.type IN ('OBLIGATORIA', 'TFM') THEN true ELSE false END as is_mandatory,
    CASE 
        WHEN s.code LIKE 'MUD%' AND s.type = 'OPTATIVA' THEN 'General'
        WHEN s.code LIKE 'MUDAT%' AND s.type = 'OPTATIVA' THEN 'Art Digital'
        ELSE NULL
    END as specialization
FROM programs p
JOIN subjects s ON s.code LIKE p.code || '%'
WHERE p.type IN ('master', 'postgrau')
ON CONFLICT (program_id, subject_id) DO NOTHING;

-- Set scheduling preferences for masters programs
INSERT INTO program_scheduling_preferences (program_id, preferred_shift, min_hours_between_classes, max_hours_per_day, preferred_days, block_scheduling, notes)
SELECT 
    id as program_id,
    CASE 
        WHEN type = 'master' THEN 'EVENING'
        WHEN type = 'postgrau' THEN 'AFTERNOON'
        ELSE 'FLEXIBLE'
    END as preferred_shift,
    0 as min_hours_between_classes,
    4 as max_hours_per_day, -- Masters typically have 4-hour blocks
    '["1","2","3","4"]'::jsonb as preferred_days, -- Monday to Thursday
    true as block_scheduling,
    'Preferència per classes en blocs de 4 hores' as notes
FROM programs
WHERE type IN ('master', 'postgrau')
ON CONFLICT (program_id) DO NOTHING;

-- Set classroom preferences for masters (prefer seminar and theory rooms)
INSERT INTO program_classrooms (program_id, classroom_id, priority, notes)
SELECT DISTINCT
    p.id as program_id,
    c.id as classroom_id,
    CASE 
        WHEN c.type = 'seminari' THEN 1
        WHEN c.type = 'teorica' THEN 2
        WHEN c.type = 'polivalent' THEN 3
        ELSE 4
    END as priority,
    'Aula preferida per màsters' as notes
FROM programs p
CROSS JOIN classrooms c
WHERE p.type IN ('master', 'postgrau')
AND c.type IN ('seminari', 'teorica', 'polivalent')
AND c.capacity BETWEEN 15 AND 40 -- Masters typically have smaller groups
ON CONFLICT (program_id, classroom_id) DO NOTHING;

-- Set software requirements for digital masters
INSERT INTO program_software (program_id, software_id, is_required, min_licenses, notes)
SELECT 
    p.id as program_id,
    s.id as software_id,
    true as is_required,
    20 as min_licenses,
    'Software essencial per al màster' as notes
FROM programs p
CROSS JOIN software s
WHERE p.code IN ('MUDAT', 'MUDG')
AND s.name IN ('Adobe Creative Suite', 'Unity', 'Blender', 'Processing', 'TouchDesigner')
ON CONFLICT (program_id, software_id) DO NOTHING;

-- Set equipment requirements for masters
INSERT INTO program_equipment (program_id, equipment_type_id, min_quantity, is_required, notes)
SELECT 
    p.id as program_id,
    et.id as equipment_type_id,
    CASE 
        WHEN et.name LIKE '%Projector%' THEN 1
        WHEN et.name LIKE '%Ordinador%' THEN 20
        WHEN et.name LIKE '%Tauleta gràfica%' THEN 15
        ELSE 1
    END as min_quantity,
    true as is_required,
    'Equipament necessari per al programa' as notes
FROM programs p
CROSS JOIN equipment_types et
WHERE p.type IN ('master', 'postgrau')
AND et.name IN ('Projector 4K', 'Ordinador Mac', 'Tauleta gràfica Wacom', 'Càmera DSLR')
ON CONFLICT (program_id, equipment_type_id) DO NOTHING;

-- Create subject groups for masters subjects
INSERT INTO subject_groups (subject_id, semester_id, group_code, group_type, max_students)
SELECT 
    s.id as subject_id,
    sem.id as semester_id,
    'G1' as group_code,
    'THEORY' as group_type,
    25 as max_students
FROM subjects s
CROSS JOIN semesters sem
WHERE s.program_level IN ('master', 'postgrau')
AND sem.number = 1 -- First semester
AND s.term_number = 1
ON CONFLICT (subject_id, semester_id, group_code) DO NOTHING;

-- Add practice groups for some subjects
INSERT INTO subject_groups (subject_id, semester_id, group_code, group_type, max_students)
SELECT 
    s.id as subject_id,
    sem.id as semester_id,
    'P' || generate_series(1, 2)::text as group_code,
    'PRACTICE' as group_type,
    15 as max_students
FROM subjects s
CROSS JOIN semesters sem
WHERE s.code IN ('MUDAT102', 'MUDAT103', 'PGDM03') -- Subjects that need practice groups
AND sem.number = 1
AND s.term_number = 1
ON CONFLICT (subject_id, semester_id, group_code) DO NOTHING;