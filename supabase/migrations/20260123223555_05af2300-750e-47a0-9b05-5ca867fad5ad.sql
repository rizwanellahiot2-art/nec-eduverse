-- HR: Leave Management
CREATE TABLE IF NOT EXISTS public.hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_per_year INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days INTEGER NOT NULL DEFAULT 0,
  remaining_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HR: Staff Attendance
CREATE TABLE IF NOT EXISTS public.hr_staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id, attendance_date)
);

-- HR: Salaries
CREATE TABLE IF NOT EXISTS public.hr_salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  pay_frequency TEXT NOT NULL DEFAULT 'monthly',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HR: Contracts
CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'permanent',
  start_date DATE NOT NULL,
  end_date DATE,
  position TEXT,
  department TEXT,
  terms TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HR: Performance Reviews
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  reviewer_user_id UUID NOT NULL,
  rating INTEGER,
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HR: Documents
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

-- RLS helper: can_manage_hr
CREATE OR REPLACE FUNCTION public.can_manage_hr(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_super_admin()
  OR public.can_manage_staff(_school_id)
  OR public.has_role(_school_id, 'hr_manager');
$$;

-- RLS Policies: HR Manager can manage HR data
CREATE POLICY "HR managers can view leave types" ON public.hr_leave_types FOR SELECT USING (can_manage_hr(school_id));
CREATE POLICY "HR managers can manage leave types" ON public.hr_leave_types FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "HR managers can view leave balances" ON public.hr_leave_balances FOR SELECT USING (can_manage_hr(school_id));
CREATE POLICY "HR managers can manage leave balances" ON public.hr_leave_balances FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own leave requests" ON public.hr_leave_requests FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "Staff can create leave requests" ON public.hr_leave_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "HR managers can manage leave requests" ON public.hr_leave_requests FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own attendance" ON public.hr_staff_attendance FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "HR managers can manage attendance" ON public.hr_staff_attendance FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "HR managers can view salary records" ON public.hr_salary_records FOR SELECT USING (can_manage_hr(school_id));
CREATE POLICY "HR managers can manage salary records" ON public.hr_salary_records FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own pay runs" ON public.hr_pay_runs FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "HR managers can manage pay runs" ON public.hr_pay_runs FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own contracts" ON public.hr_contracts FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "HR managers can manage contracts" ON public.hr_contracts FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own reviews" ON public.hr_performance_reviews FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "HR managers can manage reviews" ON public.hr_performance_reviews FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

CREATE POLICY "Staff can view own documents" ON public.hr_documents FOR SELECT USING (user_id = auth.uid() OR can_manage_hr(school_id));
CREATE POLICY "HR managers can manage documents" ON public.hr_documents FOR ALL USING (can_manage_hr(school_id)) WITH CHECK (can_manage_hr(school_id));

-- Triggers for updated_at
CREATE TRIGGER update_hr_leave_types_updated_at BEFORE UPDATE ON public.hr_leave_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_leave_balances_updated_at BEFORE UPDATE ON public.hr_leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_leave_requests_updated_at BEFORE UPDATE ON public.hr_leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_staff_attendance_updated_at BEFORE UPDATE ON public.hr_staff_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_salary_records_updated_at BEFORE UPDATE ON public.hr_salary_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_pay_runs_updated_at BEFORE UPDATE ON public.hr_pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_contracts_updated_at BEFORE UPDATE ON public.hr_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_performance_reviews_updated_at BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_documents_updated_at BEFORE UPDATE ON public.hr_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for HR documents
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-documents', 'hr-documents', false) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "HR managers can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hr-documents' AND (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'hr_manager')));
CREATE POLICY "HR managers can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'hr-documents' AND (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'hr_manager')));
CREATE POLICY "HR managers can update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'hr-documents' AND (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'hr_manager')));
CREATE POLICY "HR managers can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'hr-documents' AND (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'hr_manager')));