-- Notifications (in-app)
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  user_id uuid not null,
  type text not null default 'info',
  title text not null,
  body text null,
  entity_type text null,
  entity_id text null,
  read_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

alter table public.app_notifications enable row level security;

create index if not exists idx_app_notifications_user_created_at
  on public.app_notifications (user_id, created_at desc);
create index if not exists idx_app_notifications_school_created_at
  on public.app_notifications (school_id, created_at desc);

-- Recipient can read their own notifications
create policy "Users can read own notifications"
on public.app_notifications
for select
using (user_id = auth.uid() or public.is_platform_super_admin());

-- Recipient can mark their own notifications as read
create policy "Users can update own notifications"
on public.app_notifications
for update
using (user_id = auth.uid() or public.is_platform_super_admin())
with check (user_id = auth.uid() or public.is_platform_super_admin());

-- Create notifications: user can notify self; staff managers can notify any school member
create policy "Users can create self notifications"
on public.app_notifications
for insert
with check (
  public.is_platform_super_admin()
  or (school_id is not null and user_id = auth.uid() and public.is_school_member(school_id))
  or public.can_manage_staff(school_id)
);

-- Staff managers can delete notifications in their school (cleanup)
create policy "Staff managers can delete notifications"
on public.app_notifications
for delete
using (public.is_platform_super_admin() or public.can_manage_staff(school_id));


-- Improve audit logs queryability
create index if not exists idx_audit_logs_school_created_at
  on public.audit_logs (school_id, created_at desc);
create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_type, entity_id);


-- Generic audit trigger
create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text;
begin
  if (tg_op = 'INSERT') then
    v_entity_id := coalesce(new.id::text, null);
    insert into public.audit_logs(action, entity_type, entity_id, actor_user_id, school_id, metadata)
    values (
      'insert',
      tg_table_name,
      v_entity_id,
      auth.uid(),
      coalesce(new.school_id, null),
      jsonb_build_object('table', tg_table_name)
    );
    return new;
  elsif (tg_op = 'UPDATE') then
    v_entity_id := coalesce(new.id::text, old.id::text, null);
    insert into public.audit_logs(action, entity_type, entity_id, actor_user_id, school_id, metadata)
    values (
      'update',
      tg_table_name,
      v_entity_id,
      auth.uid(),
      coalesce(new.school_id, old.school_id, null),
      jsonb_build_object('table', tg_table_name)
    );
    return new;
  elsif (tg_op = 'DELETE') then
    v_entity_id := coalesce(old.id::text, null);
    insert into public.audit_logs(action, entity_type, entity_id, actor_user_id, school_id, metadata)
    values (
      'delete',
      tg_table_name,
      v_entity_id,
      auth.uid(),
      coalesce(old.school_id, null),
      jsonb_build_object('table', tg_table_name)
    );
    return old;
  end if;
  return null;
end;
$$;

-- Attach audit triggers to key entities (id + school_id tables)
-- CRM
drop trigger if exists trg_audit_crm_leads on public.crm_leads;
create trigger trg_audit_crm_leads
after insert or update or delete on public.crm_leads
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_crm_activities on public.crm_activities;
create trigger trg_audit_crm_activities
after insert or update or delete on public.crm_activities
for each row execute function public.audit_log_trigger();

-- Finance
drop trigger if exists trg_audit_finance_invoices on public.finance_invoices;
create trigger trg_audit_finance_invoices
after insert or update or delete on public.finance_invoices
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_finance_payments on public.finance_payments;
create trigger trg_audit_finance_payments
after insert or update or delete on public.finance_payments
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_finance_expenses on public.finance_expenses;
create trigger trg_audit_finance_expenses
after insert or update or delete on public.finance_expenses
for each row execute function public.audit_log_trigger();

-- HR
drop trigger if exists trg_audit_hr_leave_requests on public.hr_leave_requests;
create trigger trg_audit_hr_leave_requests
after insert or update or delete on public.hr_leave_requests
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_hr_contracts on public.hr_contracts;
create trigger trg_audit_hr_contracts
after insert or update or delete on public.hr_contracts
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_hr_documents on public.hr_documents;
create trigger trg_audit_hr_documents
after insert or update or delete on public.hr_documents
for each row execute function public.audit_log_trigger();

-- Academics
drop trigger if exists trg_audit_students on public.students;
create trigger trg_audit_students
after insert or update or delete on public.students
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_academic_classes on public.academic_classes;
create trigger trg_audit_academic_classes
after insert or update or delete on public.academic_classes
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_class_sections on public.class_sections;
create trigger trg_audit_class_sections
after insert or update or delete on public.class_sections
for each row execute function public.audit_log_trigger();

-- Attendance
drop trigger if exists trg_audit_attendance_sessions on public.attendance_sessions;
create trigger trg_audit_attendance_sessions
after insert or update or delete on public.attendance_sessions
for each row execute function public.audit_log_trigger();

drop trigger if exists trg_audit_attendance_entries on public.attendance_entries;
create trigger trg_audit_attendance_entries
after insert or update or delete on public.attendance_entries
for each row execute function public.audit_log_trigger();


-- Realtime (subscribe-able)
-- Note: this enables realtime broadcasts; RLS still applies.
alter publication supabase_realtime add table public.app_notifications;
alter publication supabase_realtime add table public.audit_logs;
alter publication supabase_realtime add table public.crm_leads;
alter publication supabase_realtime add table public.crm_activities;
alter publication supabase_realtime add table public.finance_invoices;
alter publication supabase_realtime add table public.finance_payments;
alter publication supabase_realtime add table public.finance_expenses;
alter publication supabase_realtime add table public.hr_leave_requests;