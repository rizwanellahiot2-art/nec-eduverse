-- EDUVERSE: Academic Core v1 + Admissions CRM + Staff/User Management foundations (fixed)

-- 1) Invitations (admin-created users only)
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (school_id, email, role)
);

create index if not exists idx_user_invitations_school_id on public.user_invitations(school_id);
create index if not exists idx_user_invitations_email on public.user_invitations(email);
create index if not exists idx_user_invitations_expires_at on public.user_invitations(expires_at);

alter table public.user_invitations enable row level security;

do $$ begin
  create policy "Members can view invitations in their school"
  on public.user_invitations
  for select
  to authenticated
  using (public.is_school_member(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff managers can create invitations"
  on public.user_invitations
  for insert
  to authenticated
  with check (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff managers can update invitations"
  on public.user_invitations
  for update
  to authenticated
  using (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff managers can delete invitations"
  on public.user_invitations
  for delete
  to authenticated
  using (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

-- 2) Academic Core v1
create table if not exists public.academic_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  grade_level int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_academic_classes_updated_at') then
    create trigger trg_academic_classes_updated_at
    before update on public.academic_classes
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create table if not exists public.class_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.academic_classes(id) on delete cascade,
  name text not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, name)
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_class_sections_updated_at') then
    create trigger trg_class_sections_updated_at
    before update on public.class_sections
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_class_sections_school_id on public.class_sections(school_id);
create index if not exists idx_class_sections_class_id on public.class_sections(class_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_code text,
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text,
  date_of_birth date,
  status text not null default 'inquiry',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_students_updated_at') then
    create trigger trg_students_updated_at
    before update on public.students
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_students_status on public.students(status);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_section_id uuid not null references public.class_sections(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (school_id, student_id, class_section_id, start_date)
);

create index if not exists idx_student_enrollments_school_id on public.student_enrollments(school_id);
create index if not exists idx_student_enrollments_class_section_id on public.student_enrollments(class_section_id);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_user_id uuid not null,
  class_section_id uuid not null references public.class_sections(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, teacher_user_id, class_section_id)
);

create index if not exists idx_teacher_assignments_school_id on public.teacher_assignments(school_id);
create index if not exists idx_teacher_assignments_teacher_user_id on public.teacher_assignments(teacher_user_id);
create index if not exists idx_teacher_assignments_class_section_id on public.teacher_assignments(class_section_id);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_section_id uuid not null references public.class_sections(id) on delete cascade,
  session_date date not null,
  period_label text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (school_id, class_section_id, session_date, period_label)
);

create index if not exists idx_attendance_sessions_school_id on public.attendance_sessions(school_id);
create index if not exists idx_attendance_sessions_class_section_id on public.attendance_sessions(class_section_id);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'present',
  note text,
  created_at timestamptz not null default now(),
  unique (school_id, session_id, student_id)
);

create index if not exists idx_attendance_entries_school_id on public.attendance_entries(school_id);

alter table public.academic_classes enable row level security;
alter table public.class_sections enable row level security;
alter table public.students enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_entries enable row level security;

create or replace function public.is_teacher_assigned(_school_id uuid, _class_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.teacher_assignments ta
    where ta.school_id = _school_id
      and ta.class_section_id = _class_section_id
      and ta.teacher_user_id = auth.uid()
  );
$$;

-- Academic policies

do $$ begin
  create policy "Members can view classes"
  on public.academic_classes
  for select
  to authenticated
  using (public.is_school_member(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can manage classes"
  on public.academic_classes
  for all
  to authenticated
  using (public.can_manage_students(school_id))
  with check (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can view sections"
  on public.class_sections
  for select
  to authenticated
  using (public.is_school_member(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can manage sections"
  on public.class_sections
  for all
  to authenticated
  using (public.can_manage_students(school_id))
  with check (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can view students"
  on public.students
  for select
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can view students in assigned sections"
  on public.students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.student_enrollments se
      join public.teacher_assignments ta
        on ta.school_id = se.school_id
       and ta.class_section_id = se.class_section_id
      where se.school_id = students.school_id
        and se.student_id = students.id
        and ta.teacher_user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can create students"
  on public.students
  for insert
  to authenticated
  with check (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can update students"
  on public.students
  for update
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can view enrollments"
  on public.student_enrollments
  for select
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can view enrollments for assigned sections"
  on public.student_enrollments
  for select
  to authenticated
  using (public.is_teacher_assigned(school_id, class_section_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can manage enrollments"
  on public.student_enrollments
  for all
  to authenticated
  using (public.can_manage_students(school_id))
  with check (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can manage teacher assignments"
  on public.teacher_assignments
  for all
  to authenticated
  using (public.can_manage_students(school_id))
  with check (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can view their assignments"
  on public.teacher_assignments
  for select
  to authenticated
  using (teacher_user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can view attendance sessions"
  on public.attendance_sessions
  for select
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can view attendance sessions for assigned sections"
  on public.attendance_sessions
  for select
  to authenticated
  using (public.is_teacher_assigned(school_id, class_section_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can create attendance sessions for assigned sections"
  on public.attendance_sessions
  for insert
  to authenticated
  with check (public.is_teacher_assigned(school_id, class_section_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can update attendance sessions"
  on public.attendance_sessions
  for update
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Student managers can view attendance entries"
  on public.attendance_entries
  for select
  to authenticated
  using (public.can_manage_students(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can view attendance entries for assigned sections"
  on public.attendance_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and public.is_teacher_assigned(attendance_entries.school_id, s.class_section_id)
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Teachers can upsert attendance entries for assigned sections"
  on public.attendance_entries
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and public.is_teacher_assigned(attendance_entries.school_id, s.class_section_id)
    )
  )
  with check (
    exists (
      select 1
      from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and public.is_teacher_assigned(attendance_entries.school_id, s.class_section_id)
    )
  );
exception when duplicate_object then null; end $$;

-- 3) Admissions CRM
create table if not exists public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_pipelines_updated_at') then
    create trigger trg_crm_pipelines_updated_at
    before update on public.crm_pipelines
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create table if not exists public.crm_stages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, pipeline_id, name)
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_stages_updated_at') then
    create trigger trg_crm_stages_updated_at
    before update on public.crm_stages
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_crm_stages_pipeline_id on public.crm_stages(pipeline_id);

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  stage_id uuid not null references public.crm_stages(id) on delete restrict,
  full_name text not null,
  email text,
  phone text,
  source text,
  score int not null default 0,
  status text not null default 'open',
  assigned_to uuid,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_crm_leads_updated_at') then
    create trigger trg_crm_leads_updated_at
    before update on public.crm_leads
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

create index if not exists idx_crm_leads_school_id on public.crm_leads(school_id);
create index if not exists idx_crm_leads_stage_id on public.crm_leads(stage_id);
create index if not exists idx_crm_leads_assigned_to on public.crm_leads(assigned_to);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  activity_type text not null,
  summary text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_activities_lead_id on public.crm_activities(lead_id);

alter table public.crm_pipelines enable row level security;
alter table public.crm_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_activities enable row level security;

create or replace function public.can_work_crm(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.can_manage_staff(_school_id)
    or public.has_role(_school_id, 'marketing_staff')
    or public.has_role(_school_id, 'counselor')
  );
$$;

-- CRM policies

do $$ begin
  create policy "CRM workers can view pipelines"
  on public.crm_pipelines
  for select
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM staff managers can manage pipelines"
  on public.crm_pipelines
  for all
  to authenticated
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can view stages"
  on public.crm_stages
  for select
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM staff managers can manage stages"
  on public.crm_stages
  for all
  to authenticated
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can view leads"
  on public.crm_leads
  for select
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can create leads"
  on public.crm_leads
  for insert
  to authenticated
  with check (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can update leads"
  on public.crm_leads
  for update
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM staff managers can delete leads"
  on public.crm_leads
  for delete
  to authenticated
  using (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can view activities"
  on public.crm_activities
  for select
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can create activities"
  on public.crm_activities
  for insert
  to authenticated
  with check (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM workers can update activities"
  on public.crm_activities
  for update
  to authenticated
  using (public.can_work_crm(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "CRM staff managers can delete activities"
  on public.crm_activities
  for delete
  to authenticated
  using (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;
