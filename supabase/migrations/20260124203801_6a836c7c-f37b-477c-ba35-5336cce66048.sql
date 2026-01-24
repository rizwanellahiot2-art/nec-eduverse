-- Add parent_name column to students table for differentiation
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.students.parent_name IS 'Parent/guardian name for student identification';