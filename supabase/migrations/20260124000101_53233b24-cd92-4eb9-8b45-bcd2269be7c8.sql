-- Enable trigram search for fast ILIKE
create extension if not exists pg_trgm;

-- Unified, server-side directory search with pagination + filters.
-- SECURITY INVOKER so Row Level Security is enforced.
create or replace function public.directory_search(
  _school_id uuid,
  _entity text default null,          -- 'students' | 'staff' | 'leads' | null
  _q text default null,
  _status text default null,          -- optional status filter (entity-specific)
  _limit int default 25,
  _offset int default 0
)
returns table(
  entity text,
  id text,
  title text,
  subtitle text,
  status text,
  created_at timestamptz,
  total_count bigint
)
language sql
security invoker
set search_path = public
as $$
  with params as (
    select
      _school_id as school_id,
      nullif(btrim(coalesce(_q, '')), '') as q,
      nullif(btrim(coalesce(_entity, '')), '') as entity,
      nullif(btrim(coalesce(_status, '')), '') as status,
      greatest(coalesce(_limit, 25), 1) as lim,
      greatest(coalesce(_offset, 0), 0) as off
  ),
  unioned as (
    -- Students
    select
      'students'::text as entity,
      s.id::text as id,
      (s.first_name || ' ' || coalesce(s.last_name, ''))::text as title,
      'Student'::text as subtitle,
      coalesce(s.status, 'unknown')::text as status,
      s.created_at as created_at
    from public.students s, params p
    where s.school_id = p.school_id
      and (p.entity is null or p.entity = 'students')
      and (p.status is null or coalesce(s.status, 'unknown') = p.status)
      and (
        p.q is null
        or (s.first_name || ' ' || coalesce(s.last_name, '')) ilike ('%' || p.q || '%')
      )

    union all

    -- Staff directory (read-only view/table)
    select
      'staff'::text as entity,
      d.user_id::text as id,
      coalesce(d.display_name, d.email, d.user_id::text)::text as title,
      coalesce(d.email, 'Staff')::text as subtitle,
      'active'::text as status,
      now() as created_at
    from public.school_user_directory d, params p
    where d.school_id = p.school_id
      and (p.entity is null or p.entity = 'staff')
      and (
        p.q is null
        or coalesce(d.display_name, '') ilike ('%' || p.q || '%')
        or coalesce(d.email, '') ilike ('%' || p.q || '%')
      )

    union all

    -- Leads
    select
      'leads'::text as entity,
      l.id::text as id,
      coalesce(l.full_name, 'Lead')::text as title,
      trim(both ' ' from (coalesce(l.email, '') || ' ' || coalesce(l.phone, '')))::text as subtitle,
      coalesce(l.status, 'open')::text as status,
      l.created_at as created_at
    from public.crm_leads l, params p
    where l.school_id = p.school_id
      and (p.entity is null or p.entity = 'leads')
      and (p.status is null or coalesce(l.status, 'open') = p.status)
      and (
        p.q is null
        or coalesce(l.full_name, '') ilike ('%' || p.q || '%')
        or coalesce(l.email, '') ilike ('%' || p.q || '%')
        or coalesce(l.phone, '') ilike ('%' || p.q || '%')
        or coalesce(l.status, '') ilike ('%' || p.q || '%')
      )
  ),
  counted as (
    select u.*, count(*) over() as total_count
    from unioned u
  )
  select
    entity,
    id,
    title,
    subtitle,
    status,
    created_at,
    total_count
  from counted
  order by
    case when entity = 'students' then 1 when entity = 'staff' then 2 else 3 end,
    created_at desc,
    title asc
  limit (select lim from params)
  offset (select off from params);
$$;

-- Helpful indexes (best-effort; uses pg_trgm)
create index if not exists students_name_trgm_idx
  on public.students using gin (((first_name || ' ' || coalesce(last_name, ''))) gin_trgm_ops);

create index if not exists crm_leads_name_trgm_idx
  on public.crm_leads using gin ((coalesce(full_name, '')) gin_trgm_ops);

create index if not exists crm_leads_email_trgm_idx
  on public.crm_leads using gin ((coalesce(email, '')) gin_trgm_ops);

create index if not exists crm_leads_phone_trgm_idx
  on public.crm_leads using gin ((coalesce(phone, '')) gin_trgm_ops);

-- school_user_directory could be a view; indexes may not be allowed. Attempting would fail.
