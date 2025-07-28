-- Create equipment_types table (referenced in code but migration was missing)
CREATE TABLE equipment_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    specifications JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_equipment_types_code ON equipment_types(code);
CREATE INDEX idx_equipment_types_category ON equipment_types(category);
CREATE INDEX idx_equipment_types_active ON equipment_types(active);

-- Enable RLS
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Equipment types are viewable by authenticated users" ON equipment_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Equipment types are manageable by authenticated users" ON equipment_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Create program_equipment table for program equipment requirements
CREATE TABLE program_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, equipment_type_id)
);

-- Add indexes
CREATE INDEX idx_program_equipment_program ON program_equipment(program_id);
CREATE INDEX idx_program_equipment_type ON program_equipment(equipment_type_id);

-- Enable RLS
ALTER TABLE program_equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Program equipment are viewable by authenticated users" ON program_equipment
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program equipment are manageable by authenticated users" ON program_equipment
    FOR ALL USING (auth.role() = 'authenticated');

-- Create classroom_equipment table to track equipment in classrooms
CREATE TABLE classroom_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    equipment_type_id UUID NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, equipment_type_id)
);

-- Add indexes
CREATE INDEX idx_classroom_equipment_classroom ON classroom_equipment(classroom_id);
CREATE INDEX idx_classroom_equipment_type ON classroom_equipment(equipment_type_id);

-- Enable RLS
ALTER TABLE classroom_equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Classroom equipment are viewable by authenticated users" ON classroom_equipment
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Classroom equipment are manageable by authenticated users" ON classroom_equipment
    FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_equipment_types_updated_at BEFORE UPDATE ON equipment_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_equipment_updated_at BEFORE UPDATE ON classroom_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some common equipment types
INSERT INTO equipment_types (code, name, category, specifications) VALUES
    ('PROJ_HD', 'Projector HD', 'audiovisual', '{"resolution": "1920x1080", "brightness": "3000 lumens"}'),
    ('PROJ_4K', 'Projector 4K', 'audiovisual', '{"resolution": "3840x2160", "brightness": "4000 lumens"}'),
    ('SCREEN_INT', 'Interactive Screen', 'audiovisual', '{"size": "75 inches", "touch": true}'),
    ('WACOM_CTL', 'Wacom Cintiq Large', 'drawing', '{"size": "24 inches", "pressure_levels": 8192}'),
    ('WACOM_CTM', 'Wacom Cintiq Medium', 'drawing', '{"size": "16 inches", "pressure_levels": 8192}'),
    ('3D_PRINTER', '3D Printer', 'fabrication', '{"type": "FDM", "build_volume": "200x200x200mm"}'),
    ('LASER_CUT', 'Laser Cutter', 'fabrication', '{"power": "60W", "bed_size": "600x400mm"}'),
    ('CAMERA_DSLR', 'DSLR Camera', 'photography', '{"type": "Full Frame", "resolution": "24MP"}'),
    ('LIGHTING_STD', 'Studio Lighting Kit', 'photography', '{"lights": 3, "type": "LED"}'),
    ('SOUND_MIX', 'Sound Mixing Console', 'audio', '{"channels": 16, "type": "digital"}')
ON CONFLICT (code) DO NOTHING;