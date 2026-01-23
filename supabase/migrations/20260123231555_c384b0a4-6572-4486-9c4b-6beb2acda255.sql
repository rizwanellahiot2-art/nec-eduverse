-- Add missing created_by columns to tables that lack them
DO $$
DECLARE
  tables_needing_created_by text[] := ARRAY[
    'academic_classes', 'admin_messages', 'assignments', 'attendance_entries',
    'behavior_notes', 'class_sections', 'crm_leads', 'finance_invoice_items',
    'finance_payment_methods', 'finance_payments', 'homework', 'hr_documents',
    'hr_leave_balances', 'hr_leave_requests', 'hr_leave_types', 'hr_pay_runs',
    'hr_performance_reviews', 'hr_staff_attendance', 'parent_messages',
    'parent_notifications', 'student_enrollments', 'student_fee_accounts',
    'student_guardians', 'student_marks', 'student_results', 'students',
    'support_conversations', 'support_messages', 'teacher_assignments',
    'timetable_entries', 'timetable_periods'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_needing_created_by
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = tbl 
        AND column_name = 'created_by'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN created_by uuid', tbl);
    END IF;
  END LOOP;
END $$;

-- Platform super admin SELECT policies on key tables

DROP POLICY IF EXISTS "Platform super admins can view all schools" ON public.schools;
CREATE POLICY "Platform super admins can view all schools"
ON public.schools FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all students" ON public.students;
CREATE POLICY "Platform super admins can view all students"
ON public.students FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Platform super admins can view all user_roles"
ON public.user_roles FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all school_memberships" ON public.school_memberships;
CREATE POLICY "Platform super admins can view all school_memberships"
ON public.school_memberships FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all finance_invoices" ON public.finance_invoices;
CREATE POLICY "Platform super admins can view all finance_invoices"
ON public.finance_invoices FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all finance_payments" ON public.finance_payments;
CREATE POLICY "Platform super admins can view all finance_payments"
ON public.finance_payments FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all hr_contracts" ON public.hr_contracts;
CREATE POLICY "Platform super admins can view all hr_contracts"
ON public.hr_contracts FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all attendance_entries" ON public.attendance_entries;
CREATE POLICY "Platform super admins can view all attendance_entries"
ON public.attendance_entries FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all crm_leads" ON public.crm_leads;
CREATE POLICY "Platform super admins can view all crm_leads"
ON public.crm_leads FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all academic_classes" ON public.academic_classes;
CREATE POLICY "Platform super admins can view all academic_classes"
ON public.academic_classes FOR SELECT
USING (is_platform_super_admin());

DROP POLICY IF EXISTS "Platform super admins can view all class_sections" ON public.class_sections;
CREATE POLICY "Platform super admins can view all class_sections"
ON public.class_sections FOR SELECT
USING (is_platform_super_admin());