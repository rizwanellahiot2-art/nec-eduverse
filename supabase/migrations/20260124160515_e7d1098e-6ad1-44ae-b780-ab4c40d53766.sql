-- Add late penalty configuration to assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS late_penalty_percent_per_day numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_late_penalty_percent numeric(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS allow_late_submissions boolean DEFAULT true;

-- Add penalty tracking to submissions
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS days_late integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_applied numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS marks_before_penalty numeric(10,2);

COMMENT ON COLUMN public.assignments.late_penalty_percent_per_day IS 'Percentage of marks deducted per day late (e.g., 10 = 10% per day)';
COMMENT ON COLUMN public.assignments.max_late_penalty_percent IS 'Maximum total penalty percentage (e.g., 50 = max 50% deduction)';
COMMENT ON COLUMN public.assignments.allow_late_submissions IS 'Whether late submissions are accepted at all';
COMMENT ON COLUMN public.assignment_submissions.days_late IS 'Number of days the submission was late';
COMMENT ON COLUMN public.assignment_submissions.penalty_applied IS 'Percentage penalty that was applied';
COMMENT ON COLUMN public.assignment_submissions.marks_before_penalty IS 'Original marks before penalty deduction';