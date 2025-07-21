-- Create table for subject group profiles
CREATE TABLE subject_group_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for subject_id
CREATE INDEX idx_subject_group_profiles_subject_id ON subject_group_profiles(subject_id);

-- Junction table to link student groups to profiles
CREATE TABLE subject_group_profile_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES subject_group_profiles(id) ON DELETE CASCADE,
  student_group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, student_group_id)
);

-- Create indexes for junction table
CREATE INDEX idx_subject_group_profile_members_profile_id ON subject_group_profile_members(profile_id);
CREATE INDEX idx_subject_group_profile_members_group_id ON subject_group_profile_members(student_group_id);

-- Software requirements per group profile
CREATE TABLE subject_group_profile_software (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES subject_group_profiles(id) ON DELETE CASCADE,
  software_id UUID NOT NULL REFERENCES software(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, software_id)
);

-- Create indexes for software requirements
CREATE INDEX idx_subject_group_profile_software_profile_id ON subject_group_profile_software(profile_id);
CREATE INDEX idx_subject_group_profile_software_software_id ON subject_group_profile_software(software_id);

-- Enable RLS
ALTER TABLE subject_group_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_group_profile_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_group_profile_software ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_group_profiles
CREATE POLICY "Enable all operations for authenticated users" ON subject_group_profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS policies for subject_group_profile_members
CREATE POLICY "Enable all operations for authenticated users" ON subject_group_profile_members
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS policies for subject_group_profile_software
CREATE POLICY "Enable all operations for authenticated users" ON subject_group_profile_software
  FOR ALL USING (auth.role() = 'authenticated');

-- Update trigger for updated_at
CREATE TRIGGER update_subject_group_profiles_updated_at 
  BEFORE UPDATE ON subject_group_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();