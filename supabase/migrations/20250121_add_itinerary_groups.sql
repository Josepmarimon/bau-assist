-- Add second year itinerary groups for Design degree
-- These are specialized groups for second year students following specific itineraries
-- The naming convention follows: GR2-{itinerary_code}

-- First, let's check if these groups already exist and insert only if they don't
INSERT INTO student_groups (name, year, shift, max_students)
SELECT * FROM (VALUES 
    -- Morning groups
    ('GR2-Im', 2, 'mati', 30),     -- Itinerari Imatge (Morning)
    ('GR2-Gm1', 2, 'mati', 30),    -- Itinerari Gràfic 1 (Morning)
    ('GR2-Gm2', 2, 'mati', 30),    -- Itinerari Gràfic 2 (Morning)
    ('GR2-Am', 2, 'mati', 30),     -- Itinerari Audiovisual (Morning)
    ('GR2-Mm', 2, 'mati', 30),     -- Itinerari Moda (Morning)
    
    -- Afternoon groups
    ('GR2-It', 2, 'tarda', 30),    -- Itinerari Imatge (Afternoon)
    ('GR2-Gt', 2, 'tarda', 30),    -- Itinerari Gràfic (Afternoon)
    ('GR2-At', 2, 'tarda', 30),    -- Itinerari Audiovisual (Afternoon)
    ('GR2-Mt', 2, 'tarda', 30)     -- Itinerari Moda (Afternoon)
) AS new_groups(name, year, shift, max_students)
WHERE NOT EXISTS (
    SELECT 1 FROM student_groups 
    WHERE student_groups.name = new_groups.name
);

-- Add a comment to document these groups
COMMENT ON TABLE student_groups IS 'Student groups including regular groups (e.g., GR2-M1) and itinerary groups (e.g., GR2-Im for 2nd year Image itinerary)';