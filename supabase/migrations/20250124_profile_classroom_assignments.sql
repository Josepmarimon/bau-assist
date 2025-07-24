-- Create table for profile classroom assignments
CREATE TABLE IF NOT EXISTS public.profile_classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.subject_group_profiles(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    is_full_semester BOOLEAN DEFAULT true,
    week_range_type TEXT CHECK (week_range_type IN ('full', 'specific_weeks', 'odd_weeks', 'even_weeks')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate assignments for same profile, time slot, and semester
    UNIQUE(profile_id, time_slot_id, semester_id)
);

-- Create table for specific weeks for profile assignments
CREATE TABLE IF NOT EXISTS public.profile_assignment_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_assignment_id UUID NOT NULL REFERENCES public.profile_classroom_assignments(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate week entries
    UNIQUE(profile_assignment_id, week_number)
);

-- Add indexes for better performance
CREATE INDEX idx_profile_classroom_assignments_profile_id ON public.profile_classroom_assignments(profile_id);
CREATE INDEX idx_profile_classroom_assignments_classroom_id ON public.profile_classroom_assignments(classroom_id);
CREATE INDEX idx_profile_classroom_assignments_semester_id ON public.profile_classroom_assignments(semester_id);
CREATE INDEX idx_profile_classroom_assignments_time_slot_id ON public.profile_classroom_assignments(time_slot_id);
CREATE INDEX idx_profile_assignment_weeks_assignment_id ON public.profile_assignment_weeks(profile_assignment_id);

-- Enable RLS
ALTER TABLE public.profile_classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_assignment_weeks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.profile_classroom_assignments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.profile_classroom_assignments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.profile_classroom_assignments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.profile_classroom_assignments
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.profile_assignment_weeks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.profile_assignment_weeks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.profile_assignment_weeks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.profile_assignment_weeks
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to check profile classroom conflicts
CREATE OR REPLACE FUNCTION check_profile_classroom_conflicts(
    p_classroom_id UUID,
    p_time_slot_id UUID,
    p_week_numbers INTEGER[],
    p_semester_id UUID,
    p_exclude_profile_assignment_id UUID DEFAULT NULL
)
RETURNS TABLE (
    profile_name TEXT,
    conflicting_weeks INTEGER[]
) AS $$
BEGIN
    RETURN QUERY
    WITH conflict_weeks AS (
        SELECT 
            sgp.name AS profile_name,
            CASE 
                WHEN pca.is_full_semester THEN 
                    ARRAY(SELECT generate_series(1, 15))
                ELSE 
                    ARRAY_AGG(DISTINCT paw.week_number)
            END AS weeks
        FROM profile_classroom_assignments pca
        JOIN subject_group_profiles sgp ON sgp.id = pca.profile_id
        LEFT JOIN profile_assignment_weeks paw ON paw.profile_assignment_id = pca.id
        WHERE pca.classroom_id = p_classroom_id
            AND pca.time_slot_id = p_time_slot_id
            AND pca.semester_id = p_semester_id
            AND (p_exclude_profile_assignment_id IS NULL OR pca.id != p_exclude_profile_assignment_id)
        GROUP BY sgp.name, pca.is_full_semester
    )
    SELECT 
        cw.profile_name,
        ARRAY(
            SELECT DISTINCT unnest(cw.weeks)
            WHERE unnest(cw.weeks) = ANY(p_week_numbers)
            ORDER BY 1
        ) AS conflicting_weeks
    FROM conflict_weeks cw
    WHERE EXISTS (
        SELECT 1 
        FROM unnest(cw.weeks) AS week_num
        WHERE week_num = ANY(p_week_numbers)
    );
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at
CREATE TRIGGER update_profile_classroom_assignments_updated_at
    BEFORE UPDATE ON public.profile_classroom_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();