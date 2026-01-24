-- Subjects catalog (school-wide)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  name text not null,
  code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null
);

create unique index if not exists subjects_school_name_uniq
  on public.subjects (school_id, lower(name));

alter table public.subjects enable row level security;

create policy "Members can view subjects"
  on public.subjects
  for select
  using (public.is_school_member(school_id));

create policy "Academic managers can manage subjects"
  on public.subjects
  for all
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));

-- Section → subjects mapping (subjects offered in a section)
create table if not exists public.class_section_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_section_id uuid not null,
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create unique index if not exists class_section_subjects_uniq
  on public.class_section_subjects (school_id, class_section_id, subject_id);

alter table public.class_section_subjects enable row level security;

create policy "Members can view class_section_subjects"
  on public.class_section_subjects
  for select
  using (public.is_school_member(school_id));

create policy "Academic managers can manage class_section_subjects"
  on public.class_section_subjects
  for all
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));

-- One teacher per subject+section
create table if not exists public.teacher_subject_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_section_id uuid not null,
  subject_id uuid not null,
  teacher_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null
);

create unique index if not exists teacher_subject_assignments_uniq
  on public.teacher_subject_assignments (school_id, class_section_id, subject_id);

alter table public.teacher_subject_assignments enable row level security;

create policy "Members can view teacher_subject_assignments"
  on public.teacher_subject_assignments
  for select
  using (public.is_school_member(school_id));

create policy "Academic managers can manage teacher_subject_assignments"
  on public.teacher_subject_assignments
  for all
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));

-- updated_at triggers
create trigger update_subjects_updated_at
before update on public.subjects
for each row execute function public.update_updated_at_column();

create trigger update_teacher_subject_assignments_updated_at
before update on public.teacher_subject_assignments
for each row execute function public.update_updated_at_column();

-- Auto-sync timetable entries whenever teacher assignment changes
create or replace function public.sync_timetable_teacher_for_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_name text;
begin
  select s.name into v_subject_name
  from public.subjects s
  where s.id = new.subject_id
    and s.school_id = new.school_id;

  if v_subject_name is null then
    return new;
  end if;

  update public.timetable_entries te
  set teacher_user_id = new.teacher_user_id,
      updated_at = now()
  where te.school_id = new.school_id
    and te.class_section_id = new.class_section_id
    and te.subject_name = v_subject_name;

  return new;
end;
$$;

drop trigger if exists trg_sync_timetable_teacher_for_subject on public.teacher_subject_assignments;
create trigger trg_sync_timetable_teacher_for_subject
after insert or update on public.teacher_subject_assignments
for each row execute function public.sync_timetable_teacher_for_subject();
