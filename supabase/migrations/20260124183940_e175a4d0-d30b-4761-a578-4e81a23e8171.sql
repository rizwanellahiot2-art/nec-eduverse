-- Add accountant role to can_manage_hr function for payroll access
CREATE OR REPLACE FUNCTION public.can_manage_hr(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_super_admin()
  OR public.can_manage_staff(_school_id)
  OR public.has_role(_school_id, 'hr_manager')
  OR public.has_role(_school_id, 'accountant');
$$;

-- Allow accountants to view students for fee management
CREATE POLICY "Accountants can view students for fees"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = students.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

-- Allow school members to view other members' profiles (for staff names in payroll/invoices)
CREATE POLICY "School members can view profiles of other school members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships sm1
    JOIN public.school_memberships sm2 ON sm1.school_id = sm2.school_id
    WHERE sm1.user_id = auth.uid()
    AND sm2.user_id = profiles.user_id
    AND sm1.status = 'active'
    AND sm2.status = 'active'
  )
);

-- Allow accountants to view finance tables
CREATE POLICY "Accountants can view finance invoices"
ON public.finance_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_invoices.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can manage finance invoices"
ON public.finance_invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_invoices.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can view finance payments"
ON public.finance_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_payments.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can manage finance payments"
ON public.finance_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_payments.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can view finance expenses"
ON public.finance_expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_expenses.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can manage finance expenses"
ON public.finance_expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = finance_expenses.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can view fee plans"
ON public.fee_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = fee_plans.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);

CREATE POLICY "Accountants can manage fee plans"
ON public.fee_plans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = fee_plans.school_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'accountant'
  )
);