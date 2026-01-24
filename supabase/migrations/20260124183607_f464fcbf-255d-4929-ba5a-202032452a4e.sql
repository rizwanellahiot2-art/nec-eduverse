-- Create salary budget targets table
CREATE TABLE public.salary_budget_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  department TEXT,
  role TEXT,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, fiscal_year, department, role)
);

-- Enable RLS
ALTER TABLE public.salary_budget_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view salary budgets for their school"
ON public.salary_budget_targets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships sm
    WHERE sm.school_id = salary_budget_targets.school_id
    AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Accountants can manage salary budgets"
ON public.salary_budget_targets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = salary_budget_targets.school_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('accountant', 'school_owner', 'principal')
  )
);

-- Create index for performance
CREATE INDEX idx_salary_budget_targets_school_year ON public.salary_budget_targets(school_id, fiscal_year);

-- Add trigger for updated_at
CREATE TRIGGER update_salary_budget_targets_updated_at
BEFORE UPDATE ON public.salary_budget_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();