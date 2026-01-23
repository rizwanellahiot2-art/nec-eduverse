-- EDUVERSE: Admin console bootstrap lock + CRM defaults

-- 1) Lock bootstrap per school
create table if not exists public.school_bootstrap (
  school_id uuid primary key references public.schools(id) on delete cascade,
  bootstrapped_at timestamptz,
  bootstrapped_by uuid,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_school_bootstrap_updated_at') then
    create trigger trg_school_bootstrap_updated_at
    before update on public.school_bootstrap
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

alter table public.school_bootstrap enable row level security;

create or replace function public.is_super_admin(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_school_id, 'super_admin');
$$;

do $$ begin
  create policy "Members can view bootstrap state"
  on public.school_bootstrap
  for select
  to authenticated
  using (public.is_school_member(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Super admins can manage bootstrap state"
  on public.school_bootstrap
  for all
  to authenticated
  using (public.is_super_admin(school_id))
  with check (public.is_super_admin(school_id));
exception when duplicate_object then null; end $$;

-- 2) Ensure each school has one default CRM pipeline (optional convenience)
create or replace function public.ensure_default_crm_pipeline(_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p_id uuid;
begin
  select id into p_id from public.crm_pipelines where school_id = _school_id and is_default = true limit 1;
  if p_id is null then
    insert into public.crm_pipelines (school_id, name, is_default)
    values (_school_id, 'Admissions', true)
    on conflict do nothing
    returning id into p_id;

    if p_id is not null then
      insert into public.crm_stages (school_id, pipeline_id, name, sort_order)
      values
        (_school_id, p_id, 'New', 10),
        (_school_id, p_id, 'Contacted', 20),
        (_school_id, p_id, 'Tour Scheduled', 30),
        (_school_id, p_id, 'Applied', 40),
        (_school_id, p_id, 'Won', 50),
        (_school_id, p_id, 'Lost', 60)
      on conflict do nothing;
    end if;
  end if;
end;
$$;
