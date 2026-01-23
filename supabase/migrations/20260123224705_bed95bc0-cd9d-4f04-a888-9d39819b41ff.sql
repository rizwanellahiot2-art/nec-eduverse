-- Consolidated migration after partial apply

-- 1) Marketing / CRM tables (idempotent)
create table if not exists public.crm_call_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  lead_id uuid not null,
  called_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  outcome text not null default 'connected',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.crm_call_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='crm_call_logs' and policyname='CRM workers can create call logs'
  ) then
    execute 'create policy "CRM workers can create call logs" on public.crm_call_logs for insert with check (public.can_work_crm(school_id))';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='crm_call_logs' and policyname='CRM workers can view call logs'
  ) then
    execute 'create policy "CRM workers can view call logs" on public.crm_call_logs for select using (public.can_work_crm(school_id))';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='crm_call_logs' and policyname='CRM workers can update call logs'
  ) then
    execute 'create policy "CRM workers can update call logs" on public.crm_call_logs for update using (public.can_work_crm(school_id))';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='crm_call_logs' and policyname='CRM staff managers can delete call logs'
  ) then
    execute 'create policy "CRM staff managers can delete call logs" on public.crm_call_logs for delete using (public.can_manage_staff(school_id))';
  end if;
end $$;

create table if not exists public.crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  name text not null,
  channel text not null default 'other',
  start_date date,
  end_date date,
  budget numeric not null default 0,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_lead_attributions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  lead_id uuid not null,
  campaign_id uuid not null,
  attributed_at timestamptz not null default now(),
  created_by uuid,
  unique (lead_id, campaign_id)
);

alter table public.crm_campaigns enable row level security;
alter table public.crm_lead_attributions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_campaigns' and policyname='CRM workers can view campaigns') then
    execute 'create policy "CRM workers can view campaigns" on public.crm_campaigns for select using (public.can_work_crm(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_campaigns' and policyname='CRM staff managers can manage campaigns') then
    execute 'create policy "CRM staff managers can manage campaigns" on public.crm_campaigns for all using (public.can_manage_staff(school_id)) with check (public.can_manage_staff(school_id))';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_lead_attributions' and policyname='CRM workers can view lead attributions') then
    execute 'create policy "CRM workers can view lead attributions" on public.crm_lead_attributions for select using (public.can_work_crm(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_lead_attributions' and policyname='CRM workers can manage lead attributions') then
    execute 'create policy "CRM workers can manage lead attributions" on public.crm_lead_attributions for insert with check (public.can_work_crm(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_lead_attributions' and policyname='CRM workers can update lead attributions') then
    execute 'create policy "CRM workers can update lead attributions" on public.crm_lead_attributions for update using (public.can_work_crm(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_lead_attributions' and policyname='CRM staff managers can delete lead attributions') then
    execute 'create policy "CRM staff managers can delete lead attributions" on public.crm_lead_attributions for delete using (public.can_manage_staff(school_id))';
  end if;
end $$;

-- trigger (guarded)
do $$ begin
  if to_regclass('public.crm_campaigns') is not null then
    execute 'drop trigger if exists update_crm_campaigns_updated_at on public.crm_campaigns';
    execute 'create trigger update_crm_campaigns_updated_at before update on public.crm_campaigns for each row execute function public.update_updated_at_column()';
  end if;
end $$;


-- 2) Student portal tables + policies

create or replace function public.my_student_id(_school_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where s.school_id = _school_id
    and p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_my_student(_school_id uuid, _student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _student_id is not null
     and _student_id = public.my_student_id(_school_id);
$$;

create table if not exists public.academic_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_section_id uuid not null,
  title text not null,
  assessment_date date not null default current_date,
  max_marks numeric not null default 100,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.student_marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  assessment_id uuid not null,
  student_id uuid not null,
  marks numeric,
  remarks text,
  graded_at timestamptz not null default now(),
  graded_by uuid
);

alter table public.academic_assessments enable row level security;
alter table public.student_marks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='academic_assessments' and policyname='Student managers can manage assessments') then
    execute 'create policy "Student managers can manage assessments" on public.academic_assessments for all using (public.can_manage_students(school_id)) with check (public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_marks' and policyname='Student managers can manage marks') then
    execute 'create policy "Student managers can manage marks" on public.student_marks for all using (public.can_manage_students(school_id)) with check (public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_marks' and policyname='Students can view own marks') then
    execute 'create policy "Students can view own marks" on public.student_marks for select using (public.is_my_student(school_id, student_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='academic_assessments' and policyname='Students can view assessments for their section') then
    execute $p$
      create policy "Students can view assessments for their section"
      on public.academic_assessments
      for select
      using (
        exists(
          select 1
          from public.student_enrollments se
          where se.school_id = academic_assessments.school_id
            and se.student_id = public.my_student_id(academic_assessments.school_id)
            and se.class_section_id = academic_assessments.class_section_id
        )
      )
    $p$;
  end if;
end $$;

-- Timetable (these tables may already exist if earlier partial migration succeeded)
create table if not exists public.timetable_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_section_id uuid not null,
  weekday smallint not null,
  period_id uuid not null,
  subject text not null,
  room text,
  teacher_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_section_id, weekday, period_id)
);

alter table public.timetable_periods enable row level security;
alter table public.timetable_entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='timetable_periods' and policyname='Student managers can manage timetable periods') then
    execute 'create policy "Student managers can manage timetable periods" on public.timetable_periods for all using (public.can_manage_students(school_id)) with check (public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='timetable_entries' and policyname='Student managers can manage timetable entries') then
    execute 'create policy "Student managers can manage timetable entries" on public.timetable_entries for all using (public.can_manage_students(school_id)) with check (public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='timetable_entries' and policyname='Teachers can view timetable entries for assigned sections') then
    execute 'create policy "Teachers can view timetable entries for assigned sections" on public.timetable_entries for select using (public.is_teacher_assigned(school_id, class_section_id) or public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='timetable_entries' and policyname='Students can view timetable entries for their section') then
    execute $p$
      create policy "Students can view timetable entries for their section"
      on public.timetable_entries
      for select
      using (
        exists(
          select 1
          from public.student_enrollments se
          where se.school_id = timetable_entries.school_id
            and se.student_id = public.my_student_id(timetable_entries.school_id)
            and se.class_section_id = timetable_entries.class_section_id
        )
      )
    $p$;
  end if;
end $$;

-- Timetable trigger (guarded)
do $$ begin
  if to_regclass('public.timetable_entries') is not null then
    execute 'drop trigger if exists update_timetable_entries_updated_at on public.timetable_entries';
    execute 'create trigger update_timetable_entries_updated_at before update on public.timetable_entries for each row execute function public.update_updated_at_column()';
  end if;
end $$;

-- Certificates
create table if not exists public.student_certificates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  certificate_type text not null default 'general',
  title text not null,
  file_url text not null,
  issued_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.student_certificates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_certificates' and policyname='Student managers can manage certificates') then
    execute 'create policy "Student managers can manage certificates" on public.student_certificates for all using (public.can_manage_students(school_id)) with check (public.can_manage_students(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_certificates' and policyname='Students can view own certificates') then
    execute 'create policy "Students can view own certificates" on public.student_certificates for select using (public.is_my_student(school_id, student_id))';
  end if;
end $$;

-- Support chat
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  conversation_id uuid not null,
  sender_user_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_conversations' and policyname='Students can view own conversations') then
    execute 'create policy "Students can view own conversations" on public.support_conversations for select using (public.is_my_student(school_id, student_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_conversations' and policyname='Students can create own conversations') then
    execute 'create policy "Students can create own conversations" on public.support_conversations for insert with check (public.is_my_student(school_id, student_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_conversations' and policyname='Staff can manage conversations') then
    execute 'create policy "Staff can manage conversations" on public.support_conversations for all using (public.can_manage_staff(school_id)) with check (public.can_manage_staff(school_id))';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_messages' and policyname='Students can view messages in own conversations') then
    execute $p$
      create policy "Students can view messages in own conversations"
      on public.support_messages
      for select
      using (
        exists(
          select 1
          from public.support_conversations c
          where c.id = support_messages.conversation_id
            and c.school_id = support_messages.school_id
            and public.is_my_student(c.school_id, c.student_id)
        )
      )
    $p$;
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_messages' and policyname='Students can send messages in own conversations') then
    execute $p$
      create policy "Students can send messages in own conversations"
      on public.support_messages
      for insert
      with check (
        sender_user_id = auth.uid()
        and exists(
          select 1
          from public.support_conversations c
          where c.id = support_messages.conversation_id
            and c.school_id = support_messages.school_id
            and public.is_my_student(c.school_id, c.student_id)
        )
      )
    $p$;
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_messages' and policyname='Staff can manage support messages') then
    execute 'create policy "Staff can manage support messages" on public.support_messages for all using (public.can_manage_staff(school_id)) with check (public.can_manage_staff(school_id))';
  end if;
end $$;

-- Support conversations trigger (guarded)
do $$ begin
  if to_regclass('public.support_conversations') is not null then
    execute 'drop trigger if exists update_support_conversations_updated_at on public.support_conversations';
    execute 'create trigger update_support_conversations_updated_at before update on public.support_conversations for each row execute function public.update_updated_at_column()';
  end if;
end $$;

-- Student read-only access to existing tables

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='students' and policyname='Students can view own student row') then
    execute 'create policy "Students can view own student row" on public.students for select using (public.is_my_student(school_id, id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_enrollments' and policyname='Students can view own enrollments') then
    execute 'create policy "Students can view own enrollments" on public.student_enrollments for select using (public.is_my_student(school_id, student_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_entries' and policyname='Students can view own attendance entries') then
    execute 'create policy "Students can view own attendance entries" on public.attendance_entries for select using (student_id = public.my_student_id(school_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_sessions' and policyname='Students can view attendance sessions for their section') then
    execute $p$
      create policy "Students can view attendance sessions for their section"
      on public.attendance_sessions
      for select
      using (
        exists(
          select 1
          from public.student_enrollments se
          where se.school_id = attendance_sessions.school_id
            and se.student_id = public.my_student_id(attendance_sessions.school_id)
            and se.class_section_id = attendance_sessions.class_section_id
        )
      )
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assignments' and policyname='Students can view assignments for their section') then
    execute $p$
      create policy "Students can view assignments for their section"
      on public.assignments
      for select
      using (
        exists(
          select 1
          from public.student_enrollments se
          where se.school_id = assignments.school_id
            and se.student_id = public.my_student_id(assignments.school_id)
            and se.class_section_id = assignments.class_section_id
        )
      )
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='homework' and policyname='Students can view homework for their section') then
    execute $p$
      create policy "Students can view homework for their section"
      on public.homework
      for select
      using (
        exists(
          select 1
          from public.student_enrollments se
          where se.school_id = homework.school_id
            and se.student_id = public.my_student_id(homework.school_id)
            and se.class_section_id = homework.class_section_id
        )
      )
    $p$;
  end if;
end $$;
