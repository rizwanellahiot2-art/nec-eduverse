-- Timetable builder: link entries to periods
alter table public.timetable_entries
  add column if not exists period_id uuid;

-- optional FK (kept nullable for legacy rows)
alter table public.timetable_entries
  drop constraint if exists timetable_entries_period_id_fkey;
alter table public.timetable_entries
  add constraint timetable_entries_period_id_fkey
  foreign key (period_id) references public.timetable_periods(id)
  on delete set null;

-- Prevent duplicate cells (only for period-linked rows)
create unique index if not exists timetable_entries_unique_cell
  on public.timetable_entries (school_id, class_section_id, day_of_week, period_id)
  where period_id is not null;

create index if not exists timetable_entries_section_day_idx
  on public.timetable_entries (school_id, class_section_id, day_of_week, start_time);


-- Per-subject grading: enrich assessments with subject + teacher
alter table public.academic_assessments
  add column if not exists subject_id uuid,
  add column if not exists teacher_user_id uuid;

alter table public.academic_assessments
  drop constraint if exists academic_assessments_subject_id_fkey;
alter table public.academic_assessments
  add constraint academic_assessments_subject_id_fkey
  foreign key (subject_id) references public.subjects(id)
  on delete set null;

create index if not exists academic_assessments_section_date_idx
  on public.academic_assessments (school_id, class_section_id, assessment_date desc);

create index if not exists academic_assessments_subject_idx
  on public.academic_assessments (school_id, subject_id, assessment_date desc);

-- Make marks unique per student+assessment
create unique index if not exists student_marks_unique_student_assessment
  on public.student_marks (school_id, assessment_id, student_id);


-- RLS: teachers can create/manage assessments & marks for their subject+section
-- (Admins already covered by existing can_manage_students policies)

drop policy if exists "Teachers can create assessments for assigned subject" on public.academic_assessments;
create policy "Teachers can create assessments for assigned subject"
on public.academic_assessments
for insert
with check (
  can_manage_students(school_id)
  or (
    teacher_user_id = auth.uid()
    and exists (
      select 1
      from public.teacher_subject_assignments tsa
      where tsa.school_id = academic_assessments.school_id
        and tsa.class_section_id = academic_assessments.class_section_id
        and tsa.subject_id = academic_assessments.subject_id
        and tsa.teacher_user_id = auth.uid()
    )
  )
);

-- Teachers can read assessments for their assigned sections (and their own)
drop policy if exists "Teachers can view assessments for assigned sections" on public.academic_assessments;
create policy "Teachers can view assessments for assigned sections"
on public.academic_assessments
for select
using (
  can_manage_students(school_id)
  or teacher_user_id = auth.uid()
  or is_teacher_assigned(school_id, class_section_id)
);

-- Teachers can update their own assessments
drop policy if exists "Teachers can update own assessments" on public.academic_assessments;
create policy "Teachers can update own assessments"
on public.academic_assessments
for update
using (
  can_manage_students(school_id)
  or teacher_user_id = auth.uid()
)
with check (
  can_manage_students(school_id)
  or (
    teacher_user_id = auth.uid()
    and exists (
      select 1
      from public.teacher_subject_assignments tsa
      where tsa.school_id = academic_assessments.school_id
        and tsa.class_section_id = academic_assessments.class_section_id
        and tsa.subject_id = academic_assessments.subject_id
        and tsa.teacher_user_id = auth.uid()
    )
  )
);

-- Teachers can delete their own assessments
drop policy if exists "Teachers can delete own assessments" on public.academic_assessments;
create policy "Teachers can delete own assessments"
on public.academic_assessments
for delete
using (
  can_manage_students(school_id)
  or teacher_user_id = auth.uid()
);

-- Teachers can manage marks for assessments they teach
drop policy if exists "Teachers can manage marks for own assessments" on public.student_marks;
create policy "Teachers can manage marks for own assessments"
on public.student_marks
for all
using (
  can_manage_students(school_id)
  or exists (
    select 1
    from public.academic_assessments a
    where a.school_id = student_marks.school_id
      and a.id = student_marks.assessment_id
      and a.teacher_user_id = auth.uid()
  )
)
with check (
  can_manage_students(school_id)
  or exists (
    select 1
    from public.academic_assessments a
    where a.school_id = student_marks.school_id
      and a.id = student_marks.assessment_id
      and a.teacher_user_id = auth.uid()
  )
);
