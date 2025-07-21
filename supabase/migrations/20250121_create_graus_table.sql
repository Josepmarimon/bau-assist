-- Create graus (degrees) table
CREATE TABLE IF NOT EXISTS graus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  codi VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE graus ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read graus"
  ON graus
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert graus"
  ON graus
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update graus"
  ON graus
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete graus"
  ON graus
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_graus_updated_at
  BEFORE UPDATE ON graus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some common degrees
INSERT INTO graus (nom, codi) VALUES
  ('Grau en Enginyeria Informàtica', 'GEI'),
  ('Grau en Disseny i Desenvolupament de Videojocs', 'GDDV'),
  ('Grau en Enginyeria de Sistemes Audiovisuals', 'GESA'),
  ('Grau en Enginyeria Electrònica Industrial i Automàtica', 'GEEIA'),
  ('Grau en Enginyeria Mecànica', 'GEM'),
  ('Grau en Disseny Industrial i Desenvolupament del Producte', 'GDIDP')
ON CONFLICT DO NOTHING;