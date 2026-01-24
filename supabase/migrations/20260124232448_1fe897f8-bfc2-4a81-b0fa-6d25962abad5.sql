-- Ensure all authenticated users associated with a school can read timetable periods.
-- This fixes teacher/student/parent portals showing 0 periods even when periods exist.

create or replace function public.is_school_user(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_super_admin()
  or exists(
    select 1
    from public.school_memberships m
    where m.school_id = _school_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists(
    select 1
    from public.user_roles ur
    where ur.school_id = _school_id
      and ur.user_id = auth.uid()
  );
$$;

alter table public.timetable_periods enable row level security;

drop policy if exists "Users can view timetable periods" on public.timetable_periods;

create policy "Users can view timetable periods"
on public.timetable_periods
for select
using (public.is_school_user(school_id));
