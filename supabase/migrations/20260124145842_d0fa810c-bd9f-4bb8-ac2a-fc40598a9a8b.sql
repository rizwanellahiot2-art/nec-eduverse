-- Add unique constraint for student_results table
ALTER TABLE public.student_results 
ADD CONSTRAINT student_results_school_student_assignment_key 
UNIQUE (school_id, student_id, assignment_id);