-- Move extensions out of public schema (security linter)
create schema if not exists extensions;

-- Ensure default privileges are safe; grant usage to public/authenticated as needed
grant usage on schema extensions to postgres, anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    -- If already moved, this is a no-op.
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end $$;
