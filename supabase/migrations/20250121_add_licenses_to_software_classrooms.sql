-- Add licenses column to software_classrooms table
ALTER TABLE public.software_classrooms
ADD COLUMN licenses INTEGER DEFAULT 1 CHECK (licenses > 0);

-- Update existing records to have 1 license by default
UPDATE public.software_classrooms
SET licenses = 1
WHERE licenses IS NULL;