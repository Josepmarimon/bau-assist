-- Check how many classrooms have software assigned
SELECT COUNT(DISTINCT classroom_id) as classrooms_with_software
FROM classroom_software;

-- Check how many software items are assigned
SELECT COUNT(DISTINCT software_id) as software_items_assigned
FROM classroom_software;

-- List all classroom-software assignments
SELECT 
    c.code as classroom_code,
    c.name as classroom_name,
    s.name as software_name,
    cs.licenses,
    cs.installed_date
FROM classroom_software cs
JOIN classrooms c ON cs.classroom_id = c.id
JOIN software s ON cs.software_id = s.id
ORDER BY c.code, s.name;

-- Check which classrooms are of type 'Informàtica' but have no software
SELECT 
    c.code,
    c.name,
    c.type
FROM classrooms c
WHERE c.type = 'Informàtica'
AND NOT EXISTS (
    SELECT 1 
    FROM classroom_software cs 
    WHERE cs.classroom_id = c.id
);