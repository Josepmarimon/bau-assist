-- Create table for subject equipment requirements
CREATE TABLE subject_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    quantity_required INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, equipment_type_id)
);

-- Create indexes
CREATE INDEX idx_subject_equipment_subject_id ON subject_equipment(subject_id);
CREATE INDEX idx_subject_equipment_equipment_type_id ON subject_equipment(equipment_type_id);

-- Enable RLS
ALTER TABLE subject_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view subject equipment" ON subject_equipment
    FOR SELECT USING (true);

CREATE POLICY "Users can insert subject equipment" ON subject_equipment
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update subject equipment" ON subject_equipment
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete subject equipment" ON subject_equipment
    FOR DELETE USING (true);