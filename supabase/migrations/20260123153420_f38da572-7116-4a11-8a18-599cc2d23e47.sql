-- EDUVERSE: School user directory (for staff management + assignments)
create table if not exists public.school_user_directory (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id),
  unique (school_id, email)
);

create index if not exists idx_school_user_directory_school_id on public.school_user_directory(school_id);
create index if not exists idx_school_user_directory_user_id on public.school_user_directory(user_id);

alter table public.school_user_directory enable row level security;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_school_user_directory_updated_at') then
    create trigger trg_school_user_directory_updated_at
    before update on public.school_user_directory
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- Staff managers can see directory; members can see their own directory row

do $$ begin
  create policy "Users can view their own directory row"
  on public.school_user_directory
  for select
  to authenticated
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff managers can view directory"
  on public.school_user_directory
  for select
  to authenticated
  using (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff managers can manage directory"
  on public.school_user_directory
  for all
  to authenticated
  using (public.can_manage_staff(school_id))
  with check (public.can_manage_staff(school_id));
exception when duplicate_object then null; end $$;
