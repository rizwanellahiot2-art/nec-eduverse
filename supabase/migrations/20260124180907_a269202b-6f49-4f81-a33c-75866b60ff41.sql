-- Add allowances, deductions, and is_active columns to hr_salary_records
ALTER TABLE public.hr_salary_records
ADD COLUMN IF NOT EXISTS allowances NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deductions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to have default values
UPDATE public.hr_salary_records SET allowances = 0 WHERE allowances IS NULL;
UPDATE public.hr_salary_records SET deductions = 0 WHERE deductions IS NULL;
UPDATE public.hr_salary_records SET is_active = (effective_to IS NULL) WHERE is_active IS NULL;