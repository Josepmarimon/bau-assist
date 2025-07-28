-- Add evening shift type to time slots
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_type_check;
ALTER TABLE time_slots ADD CONSTRAINT time_slots_slot_type_check 
    CHECK (slot_type IN ('mati', 'tarda', 'vespre'));

-- Insert evening time slots (18:00 - 21:00) for all weekdays
INSERT INTO time_slots (day_of_week, start_time, end_time, slot_type)
SELECT 
    day_num,
    time_slot.start_time::time,
    time_slot.end_time::time,
    'vespre'::varchar
FROM 
    generate_series(1, 5) as day_num,
    (VALUES 
        ('18:00:00', '19:00:00'),
        ('18:00:00', '20:00:00'),
        ('18:00:00', '21:00:00'),
        ('19:00:00', '20:00:00'),
        ('19:00:00', '21:00:00'),
        ('20:00:00', '21:00:00')
    ) as time_slot(start_time, end_time)
WHERE NOT EXISTS (
    SELECT 1 FROM time_slots ts 
    WHERE ts.day_of_week = day_num 
    AND ts.start_time = time_slot.start_time::time 
    AND ts.end_time = time_slot.end_time::time
);

-- Update shift types for student groups to include evening
ALTER TABLE student_groups DROP CONSTRAINT IF EXISTS student_groups_shift_check;
ALTER TABLE student_groups ADD CONSTRAINT student_groups_shift_check 
    CHECK (shift IN ('MORNING', 'AFTERNOON', 'EVENING'));

-- Add comment
COMMENT ON COLUMN time_slots.slot_type IS 'Time slot type: mati (morning), tarda (afternoon), vespre (evening)';

-- Create a function to get available time slots for a program
CREATE OR REPLACE FUNCTION get_time_slots_for_program(
    p_program_id UUID,
    p_day_of_week INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    slot_type VARCHAR,
    is_preferred BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        ts.id,
        ts.day_of_week,
        ts.start_time,
        ts.end_time,
        ts.slot_type,
        CASE 
            WHEN psp.preferred_shift = 'MORNING' AND ts.slot_type = 'mati' THEN true
            WHEN psp.preferred_shift = 'AFTERNOON' AND ts.slot_type = 'tarda' THEN true
            WHEN psp.preferred_shift = 'EVENING' AND ts.slot_type = 'vespre' THEN true
            WHEN psp.preferred_shift = 'FLEXIBLE' THEN true
            ELSE false
        END as is_preferred
    FROM time_slots ts
    LEFT JOIN program_scheduling_preferences psp ON psp.program_id = p_program_id
    WHERE (p_day_of_week IS NULL OR ts.day_of_week = p_day_of_week)
    ORDER BY ts.day_of_week, ts.start_time;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_time_slots_for_program TO authenticated;