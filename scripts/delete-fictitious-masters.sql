-- Script to delete all fictitious master and postgraduate assignments

-- First, let's see what we have
SELECT 
    ms.id,
    p.code as program_code,
    p.name as program_name,
    p.type as program_type,
    ms.subject_name,
    c.name as classroom_name,
    ms.day_of_week,
    ms.start_time,
    ms.end_time,
    t.first_name || ' ' || t.last_name as teacher_name
FROM master_schedules ms
JOIN programs p ON ms.program_id = p.id
JOIN classrooms c ON ms.classroom_id = c.id
LEFT JOIN teachers t ON ms.teacher_id = t.id
WHERE p.type IN ('master', 'postgrau')
ORDER BY p.code, ms.day_of_week, ms.start_time;

-- Delete all master_schedules for masters and postgraus
-- WARNING: This will delete ALL master and postgraduate schedules
DELETE FROM master_schedules
WHERE program_id IN (
    SELECT id FROM programs 
    WHERE type IN ('master', 'postgrau')
);

-- Also delete the subject groups created for masters/postgraus
DELETE FROM subject_groups
WHERE subject_id IN (
    SELECT id FROM subjects 
    WHERE program_level IN ('master', 'postgrau')
);

-- Delete classroom assignments for master/postgrau subject groups
DELETE FROM classroom_assignments
WHERE subject_group_id IN (
    SELECT sg.id 
    FROM subject_groups sg
    JOIN subjects s ON sg.subject_id = s.id
    WHERE s.program_level IN ('master', 'postgrau')
);

-- Delete profile classroom assignments for master/postgrau profiles
DELETE FROM profile_classroom_assignments
WHERE profile_id IN (
    SELECT sgp.id
    FROM subject_group_profiles sgp
    JOIN subject_groups sg ON sgp.subject_group_id = sg.id
    JOIN subjects s ON sg.subject_id = s.id
    WHERE s.program_level IN ('master', 'postgrau')
);

-- Delete the subject group profiles for masters/postgraus
DELETE FROM subject_group_profiles
WHERE subject_group_id IN (
    SELECT sg.id
    FROM subject_groups sg
    JOIN subjects s ON sg.subject_id = s.id
    WHERE s.program_level IN ('master', 'postgrau')
);

-- Optionally, you can also delete the sample data:
-- DELETE FROM program_equipment WHERE program_id IN (SELECT id FROM programs WHERE type IN ('master', 'postgrau'));
-- DELETE FROM program_software WHERE program_id IN (SELECT id FROM programs WHERE type IN ('master', 'postgrau'));
-- DELETE FROM program_classrooms WHERE program_id IN (SELECT id FROM programs WHERE type IN ('master', 'postgrau'));
-- DELETE FROM program_scheduling_preferences WHERE program_id IN (SELECT id FROM programs WHERE type IN ('master', 'postgrau'));
-- DELETE FROM program_subjects WHERE program_id IN (SELECT id FROM programs WHERE type IN ('master', 'postgrau'));
-- DELETE FROM subjects WHERE program_level IN ('master', 'postgrau');
-- DELETE FROM programs WHERE type IN ('master', 'postgrau');