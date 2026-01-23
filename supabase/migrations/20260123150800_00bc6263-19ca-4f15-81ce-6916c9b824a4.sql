-- EDUVERSE (NEC-SCHOOL-CRM) foundational multi-tenant schema

-- 0) Common helpers
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Roles (RBAC)
do $$ begin
  create type public.app_role as enum (
    'super_admin',
    'school_owner',
    'principal',
    'vice_principal',
    'academic_coordinator',
    'teacher',
    'accountant',
    'hr_manager',
    'counselor',
    'student',
    'parent',
    'marketing_staff'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Core tenancy: schools
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_schools_updated_at
before update on public.schools
for each row execute function public.update_updated_at_column();

-- 3) Profiles (global user info, no roles here)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 4) Memberships (links users to schools)
create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create index if not exists idx_school_memberships_school_id on public.school_memberships(school_id);
create index if not exists idx_school_memberships_user_id on public.school_memberships(user_id);

create trigger trg_school_memberships_updated_at
before update on public.school_memberships
for each row execute function public.update_updated_at_column();

-- 5) User roles (roles are scoped to a school)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

create index if not exists idx_user_roles_school_id on public.user_roles(school_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

-- 6) White-labeling / branding per school
create table if not exists public.school_branding (
  school_id uuid primary key references public.schools(id) on delete cascade,
  logo_url text,
  accent_hue smallint not null default 222,
  accent_saturation smallint not null default 85,
  accent_lightness smallint not null default 55,
  radius_scale numeric(4,2) not null default 1.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_school_branding_updated_at
before update on public.school_branding
for each row execute function public.update_updated_at_column();

-- 7) Audit log (foundation for activity logs)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_school_id on public.audit_logs(school_id);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- 8) Security definer helpers for RLS
create or replace function public.is_school_member(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.school_memberships m
    where m.school_id = _school_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_role(_school_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles ur
    where ur.school_id = _school_id
      and ur.user_id = auth.uid()
      and ur.role = _role
  );
$$;

create or replace function public.can_manage_staff(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
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
set search_path = public
as $$
  select (
    public.can_manage_staff(_school_id)
    or public.has_role(_school_id, 'teacher')
  );
$$;

-- 9) Enable RLS
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.user_roles enable row level security;
alter table public.school_branding enable row level security;
alter table public.audit_logs enable row level security;

-- 10) RLS Policies
-- schools
create policy "Members can view their school"
on public.schools
for select
to authenticated
using (public.is_school_member(id));

-- only super_admin can create schools (platform owner)
create policy "Super admins can create schools"
on public.schools
for insert
to authenticated
with check (
  exists(
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);

create policy "Super admins can update schools"
on public.schools
for update
to authenticated
using (
  exists(
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);

-- profiles
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id);

-- school_memberships
create policy "Members can view memberships in their school"
on public.school_memberships
for select
to authenticated
using (public.is_school_member(school_id));

create policy "Staff managers can create memberships"
on public.school_memberships
for insert
to authenticated
with check (public.can_manage_staff(school_id));

create policy "Staff managers can update memberships"
on public.school_memberships
for update
to authenticated
using (public.can_manage_staff(school_id));

-- user_roles
create policy "Members can view roles in their school"
on public.user_roles
for select
to authenticated
using (public.is_school_member(school_id));

create policy "Staff managers can assign roles"
on public.user_roles
for insert
to authenticated
with check (public.can_manage_staff(school_id));

create policy "Staff managers can update roles"
on public.user_roles
for update
to authenticated
using (public.can_manage_staff(school_id));

create policy "Staff managers can delete roles"
on public.user_roles
for delete
to authenticated
using (public.can_manage_staff(school_id));

-- school_branding
create policy "Members can view branding"
on public.school_branding
for select
to authenticated
using (public.is_school_member(school_id));

create policy "Staff managers can update branding"
on public.school_branding
for insert
to authenticated
with check (public.can_manage_staff(school_id));

create policy "Staff managers can update branding (update)"
on public.school_branding
for update
to authenticated
using (public.can_manage_staff(school_id));

-- audit_logs
create policy "Members can view audit logs"
on public.audit_logs
for select
to authenticated
using (school_id is null or public.is_school_member(school_id));

create policy "Members can write audit logs"
on public.audit_logs
for insert
to authenticated
with check (school_id is null or public.is_school_member(school_id));
