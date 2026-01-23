-- Re-run with idempotent policy creation (Postgres doesn't support CREATE POLICY IF NOT EXISTS)

-- 1) Public school lookup for unauthenticated routes (no direct SELECT on schools)
create or replace function public.get_school_public_by_slug(_slug text)
returns table(id uuid, slug text, name text, is_active boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.slug, s.name, s.is_active
  from public.schools s
  where s.slug = lower(regexp_replace(coalesce(_slug,''), '[^a-z0-9-]', '', 'g'))
  limit 1;
$$;

-- 2) Platform-level Super Admin table
create table if not exists public.platform_super_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

alter table public.platform_super_admins enable row level security;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.platform_super_admins psa
    where psa.user_id = auth.uid()
  );
$$;

-- Policy: Users can view their own platform super admin flag
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_super_admins'
      and policyname = 'Users can view their own platform super admin flag'
  ) then
    create policy "Users can view their own platform super admin flag"
    on public.platform_super_admins
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- 3) Expand existing helper functions to treat platform super admin as omnipotent
create or replace function public.is_school_member(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select public.is_platform_super_admin()
  or exists(
    select 1
    from public.school_memberships m
    where m.school_id = _school_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.can_manage_staff(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select public.is_platform_super_admin()
  or (
    public.has_role(_school_id, 'super_admin')
    or public.has_role(_school_id, 'school_owner')
    or public.has_role(_school_id, 'principal')
    or public.has_role(_school_id, 'vice_principal')
  );
$$;

create or replace function public.can_manage_students(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select public.is_platform_super_admin()
  or (
    public.can_manage_staff(_school_id)
    or public.has_role(_school_id, 'teacher')
  );
$$;

create or replace function public.can_work_crm(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select public.is_platform_super_admin()
  or (
    public.can_manage_staff(_school_id)
    or public.has_role(_school_id, 'marketing_staff')
    or public.has_role(_school_id, 'counselor')
  );
$$;

create or replace function public.is_super_admin(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select public.is_platform_super_admin() or public.has_role(_school_id, 'super_admin');
$$;

-- 4) Policy: Platform super admins can view all profiles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Platform super admins can view all profiles'
  ) then
    create policy "Platform super admins can view all profiles"
    on public.profiles
    for select
    to authenticated
    using (public.is_platform_super_admin());
  end if;
end $$;
