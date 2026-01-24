-- Add time range + updated_at to timetable_periods for timetable builder
alter table public.timetable_periods
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone,
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at fresh
drop trigger if exists update_timetable_periods_updated_at on public.timetable_periods;
create trigger update_timetable_periods_updated_at
before update on public.timetable_periods
for each row execute function public.update_updated_at_column();

-- Helpful uniqueness to avoid duplicate period labels per school
create unique index if not exists timetable_periods_school_label_uniq
  on public.timetable_periods (school_id, lower(label));

create unique index if not exists timetable_periods_school_sort_uniq
  on public.timetable_periods (school_id, sort_order);
