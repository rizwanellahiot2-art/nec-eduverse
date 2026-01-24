-- Drop and recreate the teacher timetable view policy to ensure it works correctly
-- Teachers should see entries where:
-- 1. They are the assigned teacher (teacher_user_id = auth.uid())
-- 2. They are assigned to the section (is_teacher_assigned)
-- 3. They have student management permissions (can_manage_students)

DROP POLICY IF EXISTS "Teachers can view timetable for assigned sections" ON public.timetable_entries;

CREATE POLICY "Teachers can view their timetable entries"
ON public.timetable_entries
FOR SELECT
USING (
  -- Teacher is directly assigned to this entry
  (teacher_user_id = auth.uid())
  -- OR Teacher is assigned to the section
  OR is_teacher_assigned(school_id, class_section_id)
  -- OR User has student management permissions (includes principals, etc.)
  OR can_manage_students(school_id)
);