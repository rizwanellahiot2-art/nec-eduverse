-- Finance v1 (no online billing): fee plans, invoices, payments, expenses, and payment method catalog.

-- 1) Finance permission helper
CREATE OR REPLACE FUNCTION public.can_manage_finance(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select public.is_platform_super_admin()
  or public.can_manage_staff(_school_id)
  or public.has_role(_school_id, 'accountant');
$$;

-- 2) Fee plans / structures
CREATE TABLE IF NOT EXISTS public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view fee plans"
ON public.fee_plans
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage fee plans"
ON public.fee_plans
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER fee_plans_set_updated_at
BEFORE UPDATE ON public.fee_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_fee_plans_school_id ON public.fee_plans(school_id);

-- 3) Fee plan installments
CREATE TABLE IF NOT EXISTS public.fee_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  fee_plan_id uuid NOT NULL,
  label text NOT NULL,
  due_day smallint NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_plan_installments
  ADD CONSTRAINT fee_plan_installments_fee_plan_id_fkey
  FOREIGN KEY (fee_plan_id) REFERENCES public.fee_plans(id) ON DELETE CASCADE;

ALTER TABLE public.fee_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view fee plan installments"
ON public.fee_plan_installments
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage fee plan installments"
ON public.fee_plan_installments
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER fee_plan_installments_set_updated_at
BEFORE UPDATE ON public.fee_plan_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_fee_plan_installments_school_id ON public.fee_plan_installments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_plan_installments_fee_plan_id ON public.fee_plan_installments(fee_plan_id);

-- 4) Student fee accounts (assign plan to student)
CREATE TABLE IF NOT EXISTS public.student_fee_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  fee_plan_id uuid NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_fee_accounts
  ADD CONSTRAINT student_fee_accounts_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_fee_accounts
  ADD CONSTRAINT student_fee_accounts_fee_plan_id_fkey
  FOREIGN KEY (fee_plan_id) REFERENCES public.fee_plans(id);

ALTER TABLE public.student_fee_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view student fee accounts"
ON public.student_fee_accounts
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage student fee accounts"
ON public.student_fee_accounts
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER student_fee_accounts_set_updated_at
BEFORE UPDATE ON public.student_fee_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_school_id ON public.student_fee_accounts(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_student_id ON public.student_fee_accounts(student_id);

-- 5) Payment method catalog (school-defined)
CREATE TABLE IF NOT EXISTS public.finance_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  is_active boolean NOT NULL DEFAULT true,
  instructions text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view payment methods"
ON public.finance_payment_methods
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage payment methods"
ON public.finance_payment_methods
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER finance_payment_methods_set_updated_at
BEFORE UPDATE ON public.finance_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_finance_payment_methods_school_id ON public.finance_payment_methods(school_id);

-- 6) Invoices
CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  invoice_no text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NULL,
  status text NOT NULL DEFAULT 'unpaid',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  late_fee_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_invoices
  ADD CONSTRAINT finance_invoices_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view invoices"
ON public.finance_invoices
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage invoices"
ON public.finance_invoices
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER finance_invoices_set_updated_at
BEFORE UPDATE ON public.finance_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_invoices_school_invoice_no ON public.finance_invoices(school_id, invoice_no);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_school_id ON public.finance_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_student_id ON public.finance_invoices(student_id);

-- 7) Invoice line items
CREATE TABLE IF NOT EXISTS public.finance_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  label text NOT NULL,
  qty numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_invoice_items
  ADD CONSTRAINT finance_invoice_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE;

ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view invoice items"
ON public.finance_invoice_items
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage invoice items"
ON public.finance_invoice_items
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER finance_invoice_items_set_updated_at
BEFORE UPDATE ON public.finance_invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_finance_invoice_items_school_id ON public.finance_invoice_items(school_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoice_items_invoice_id ON public.finance_invoice_items(invoice_id);

-- 8) Payments (manual logs)
CREATE TABLE IF NOT EXISTS public.finance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  student_id uuid NOT NULL,
  method_id uuid NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reference text NULL,
  received_by uuid NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_payments
  ADD CONSTRAINT finance_payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE;

ALTER TABLE public.finance_payments
  ADD CONSTRAINT finance_payments_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.finance_payments
  ADD CONSTRAINT finance_payments_method_id_fkey
  FOREIGN KEY (method_id) REFERENCES public.finance_payment_methods(id);

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view payments"
ON public.finance_payments
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage payments"
ON public.finance_payments
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER finance_payments_set_updated_at
BEFORE UPDATE ON public.finance_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_finance_payments_school_id ON public.finance_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_invoice_id ON public.finance_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_student_id ON public.finance_payments(student_id);

-- 9) Expenses
CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'general',
  vendor text NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method_id uuid NULL,
  reference text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_expenses
  ADD CONSTRAINT finance_expenses_payment_method_id_fkey
  FOREIGN KEY (payment_method_id) REFERENCES public.finance_payment_methods(id);

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view expenses"
ON public.finance_expenses
FOR SELECT
USING (public.can_manage_finance(school_id));

CREATE POLICY "Finance can manage expenses"
ON public.finance_expenses
FOR ALL
USING (public.can_manage_finance(school_id))
WITH CHECK (public.can_manage_finance(school_id));

CREATE TRIGGER finance_expenses_set_updated_at
BEFORE UPDATE ON public.finance_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_finance_expenses_school_id ON public.finance_expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses(expense_date);
