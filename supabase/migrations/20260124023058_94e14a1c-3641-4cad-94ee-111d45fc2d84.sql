-- Add publish/lock workflow to timetable entries (per-entry publish)
ALTER TABLE public.timetable_entries
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Ensure fast filtering by section and publish state
CREATE INDEX IF NOT EXISTS idx_timetable_entries_section_published
ON public.timetable_entries (school_id, class_section_id, is_published);

-- Ensure fast conflict queries by slot (day+period) on teacher/room
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher_slot
ON public.timetable_entries (school_id, day_of_week, period_id, teacher_user_id);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_room_slot
ON public.timetable_entries (school_id, day_of_week, period_id, room);

-- Tighten read policies for parents/students to only see published timetable entries.
-- This assumes existing policies are present; we drop+recreate to be explicit.
DO $$
BEGIN
  -- Students
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='timetable_entries' AND policyname='Students can view timetable entries for their section'
  ) THEN
    EXECUTE 'DROP POLICY "Students can view timetable entries for their section" ON public.timetable_entries';
  END IF;

  -- Parents
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='timetable_entries' AND policyname='Parents can view timetable entries for own children sections'
  ) THEN
    EXECUTE 'DROP POLICY "Parents can view timetable entries for own children sections" ON public.timetable_entries';
  END IF;
END $$;

CREATE POLICY "Students can view published timetable entries for their section"
ON public.timetable_entries
FOR SELECT
USING (
  is_published
  AND EXISTS (
    SELECT 1
    FROM student_enrollments se
    WHERE se.school_id = timetable_entries.school_id
      AND se.student_id = my_student_id(timetable_entries.school_id)
      AND se.class_section_id = timetable_entries.class_section_id
  )
);

CREATE POLICY "Parents can view published timetable entries for own children sections"
ON public.timetable_entries
FOR SELECT
USING (
  is_published
  AND EXISTS (
    SELECT 1
    FROM student_enrollments se
    WHERE se.student_id IN (SELECT my_children(timetable_entries.school_id))
      AND se.class_section_id = timetable_entries.class_section_id
  )
);

-- Keep staff/teacher/admin policies unchanged (expected to already exist).