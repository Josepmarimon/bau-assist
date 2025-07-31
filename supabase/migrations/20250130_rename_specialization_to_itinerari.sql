-- Rename specialization column to itinerari in student_groups table
ALTER TABLE student_groups 
RENAME COLUMN specialization TO itinerari;

-- Add comment to explain the column
COMMENT ON COLUMN student_groups.itinerari IS 'Itinerari (track/specialization) for 3rd and 4th year Design students: Audiovisual, Gràfic, Interiors, or Moda';