-- Insert demo academic year
INSERT INTO academic_years (name, start_date, end_date, is_current)
VALUES ('2024-2025', '2024-09-01', '2025-07-31', true);

-- Get the academic year ID
DO $$
DECLARE
    current_year_id UUID;
BEGIN
    SELECT id INTO current_year_id FROM academic_years WHERE name = '2024-2025';
    
    -- Insert semesters
    INSERT INTO semesters (academic_year_id, name, number, start_date, end_date)
    VALUES 
        (current_year_id, 'Primer Semestre 2024-2025', 1, '2024-09-01', '2025-01-31'),
        (current_year_id, 'Segon Semestre 2024-2025', 2, '2025-02-01', '2025-07-31');
END $$;

-- Insert demo subjects
INSERT INTO subjects (code, name, credits, year, type, department, description, degree, semester, itinerari)
VALUES 
    -- First year subjects
    ('DG101', 'Fonaments del Disseny', 6, 1, 'obligatoria', 'Disseny Gràfic', 'Introducció als principis bàsics del disseny', 'Disseny', '1r', NULL),
    ('DG102', 'Dibuix I', 6, 1, 'obligatoria', 'Arts Plàstiques', 'Tècniques bàsiques de dibuix', 'Disseny', '1r', NULL),
    ('DG103', 'Història de l''Art I', 4, 1, 'obligatoria', 'Història i Teoria', 'Des de la prehistòria fins al Renaixement', 'Disseny', '1r', NULL),
    ('DG104', 'Tipografia I', 6, 1, 'obligatoria', 'Disseny Gràfic', 'Introducció a la tipografia', 'Disseny', '2n', NULL),
    ('DG105', 'Color', 4, 1, 'obligatoria', 'Disseny Gràfic', 'Teoria i aplicació del color', 'Disseny', '2n', NULL),
    
    -- Second year subjects
    ('DG201', 'Disseny Editorial', 6, 2, 'obligatoria', 'Disseny Gràfic', 'Disseny de publicacions', 'Disseny', '1r', NULL),
    ('DG202', 'Identitat Visual', 6, 2, 'obligatoria', 'Disseny Gràfic', 'Creació de marques i identitats', 'Disseny', '1r', NULL),
    ('DG203', 'Fotografia', 4, 2, 'obligatoria', 'Audiovisuals', 'Tècniques fotogràfiques', 'Disseny', '2n', NULL),
    ('DG204', 'Disseny Web I', 6, 2, 'obligatoria', 'Disseny Digital', 'HTML, CSS i disseny responsive', 'Disseny', '2n', NULL),
    
    -- Third year subjects
    ('DG301', 'Packaging', 6, 3, 'obligatoria', 'Disseny Gràfic', 'Disseny d''envasos i embalatges', 'Disseny', '1r', 'Disseny Gràfic'),
    ('DG302', 'Motion Graphics', 6, 3, 'obligatoria', 'Audiovisuals', 'Animació i gràfics en moviment', 'Disseny', '1r', 'Disseny Digital'),
    ('DG303', 'UX/UI Design', 6, 3, 'obligatoria', 'Disseny Digital', 'Experiència d''usuari i interfícies', 'Disseny', '2n', 'Disseny Digital'),
    
    -- Fourth year subjects
    ('DG401', 'Portfolio Professional', 4, 4, 'obligatoria', 'Professional', 'Preparació del portfolio', 'Disseny', '1r', NULL),
    ('DG402', 'Gestió de Projectes', 4, 4, 'obligatoria', 'Professional', 'Metodologies i gestió', 'Disseny', '1r', NULL),
    ('DG499', 'Treball Final de Grau', 12, 4, 'tfg', 'Multidisciplinar', 'Projecte final', 'Disseny', 'Anual', NULL);

-- Insert demo classrooms
INSERT INTO classrooms (code, name, building, floor, capacity, type, equipment, is_available)
VALUES 
    ('A101', 'Aula Teoria 1', 'Edifici A', 1, 40, 'teoria', '["projector", "pantalla", "equip_so"]', true),
    ('A102', 'Aula Teoria 2', 'Edifici A', 1, 40, 'teoria', '["projector", "pantalla", "equip_so"]', true),
    ('A201', 'Aula Teoria 3', 'Edifici A', 2, 35, 'teoria', '["projector", "pantalla"]', true),
    ('B101', 'Taller Disseny 1', 'Edifici B', 1, 25, 'taller', '["taules_dibuix", "cavallets"]', true),
    ('B102', 'Taller Disseny 2', 'Edifici B', 1, 25, 'taller', '["taules_dibuix", "cavallets"]', true),
    ('B201', 'Aula Informàtica 1', 'Edifici B', 2, 30, 'informatica', '["ordinadors_mac", "tablets_grafiques"]', true),
    ('B202', 'Aula Informàtica 2', 'Edifici B', 2, 30, 'informatica', '["ordinadors_mac", "tablets_grafiques"]', true),
    ('C101', 'Estudi Fotografia', 'Edifici C', 1, 20, 'polivalent', '["equip_iluminacio", "fons_fotografia"]', true),
    ('C102', 'Sala Polivalent', 'Edifici C', 1, 50, 'polivalent', '["projector", "sistema_videoconferencia"]', true);

-- Insert demo teachers
INSERT INTO teachers (code, first_name, last_name, email, department, contract_type, max_hours)
VALUES 
    ('PROF001', 'Maria', 'García López', 'mgarcia@bau.edu', 'Disseny Gràfic', 'temps_complet', 20),
    ('PROF002', 'Joan', 'Martí Puig', 'jmarti@bau.edu', 'Disseny Gràfic', 'temps_complet', 20),
    ('PROF003', 'Anna', 'Rodríguez Vila', 'arodriguez@bau.edu', 'Arts Plàstiques', 'temps_parcial', 12),
    ('PROF004', 'Pere', 'Soler Mas', 'psoler@bau.edu', 'Història i Teoria', 'temps_complet', 20),
    ('PROF005', 'Laura', 'Fernández Costa', 'lfernandez@bau.edu', 'Disseny Digital', 'temps_complet', 20),
    ('PROF006', 'Marc', 'Jiménez Serra', 'mjimenez@bau.edu', 'Audiovisuals', 'temps_parcial', 15),
    ('PROF007', 'Carla', 'Vidal Roig', 'cvidal@bau.edu', 'Disseny Gràfic', 'temps_complet', 20),
    ('PROF008', 'David', 'Pujol Camps', 'dpujol@bau.edu', 'Professional', 'temps_parcial', 10);

-- Insert time slots
-- Morning slots (9:00 - 14:00)
INSERT INTO time_slots (day_of_week, start_time, end_time, slot_type)
VALUES 
    -- Monday to Friday morning slots
    (1, '09:00', '11:00', 'mati'),
    (1, '11:00', '13:00', 'mati'),
    (1, '13:00', '14:00', 'mati'),
    (2, '09:00', '11:00', 'mati'),
    (2, '11:00', '13:00', 'mati'),
    (2, '13:00', '14:00', 'mati'),
    (3, '09:00', '11:00', 'mati'),
    (3, '11:00', '13:00', 'mati'),
    (3, '13:00', '14:00', 'mati'),
    (4, '09:00', '11:00', 'mati'),
    (4, '11:00', '13:00', 'mati'),
    (4, '13:00', '14:00', 'mati'),
    (5, '09:00', '11:00', 'mati'),
    (5, '11:00', '13:00', 'mati'),
    (5, '13:00', '14:00', 'mati'),
    
    -- Afternoon slots (15:00 - 21:00)
    (1, '15:00', '17:00', 'tarda'),
    (1, '17:00', '19:00', 'tarda'),
    (1, '19:00', '21:00', 'tarda'),
    (2, '15:00', '17:00', 'tarda'),
    (2, '17:00', '19:00', 'tarda'),
    (2, '19:00', '21:00', 'tarda'),
    (3, '15:00', '17:00', 'tarda'),
    (3, '17:00', '19:00', 'tarda'),
    (3, '19:00', '21:00', 'tarda'),
    (4, '15:00', '17:00', 'tarda'),
    (4, '17:00', '19:00', 'tarda'),
    (4, '19:00', '21:00', 'tarda'),
    (5, '15:00', '17:00', 'tarda'),
    (5, '17:00', '19:00', 'tarda'),
    (5, '19:00', '21:00', 'tarda');

-- Insert student groups
INSERT INTO student_groups (name, year, shift, max_students)
VALUES 
    ('1r A Matí', 1, 'mati', 40),
    ('1r B Tarda', 1, 'tarda', 40),
    ('2n A Matí', 2, 'mati', 35),
    ('2n B Tarda', 2, 'tarda', 35),
    ('3r A Matí', 3, 'mati', 30),
    ('3r B Tarda', 3, 'tarda', 30),
    ('4t A Matí', 4, 'mati', 25),
    ('4t B Tarda', 4, 'tarda', 25);