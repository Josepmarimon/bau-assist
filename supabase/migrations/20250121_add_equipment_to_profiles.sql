-- Create table for subject group profile equipment requirements
CREATE TABLE subject_group_profile_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES subject_group_profiles(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    quantity_required INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, equipment_type_id)
);

-- Create indexes
CREATE INDEX idx_sgp_equipment_profile_id ON subject_group_profile_equipment(profile_id);
CREATE INDEX idx_sgp_equipment_equipment_type_id ON subject_group_profile_equipment(equipment_type_id);

-- Enable RLS
ALTER TABLE subject_group_profile_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view subject group profile equipment" ON subject_group_profile_equipment
    FOR SELECT USING (true);

CREATE POLICY "Users can insert subject group profile equipment" ON subject_group_profile_equipment
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update subject group profile equipment" ON subject_group_profile_equipment
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete subject group profile equipment" ON subject_group_profile_equipment
    FOR DELETE USING (true);