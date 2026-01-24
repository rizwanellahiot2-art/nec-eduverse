-- Drop the duplicate/conflicting policy
DROP POLICY IF EXISTS "Teachers can view timetable entries for assigned sections" ON public.timetable_entries;

-- Update the remaining policy to be more comprehensive
DROP POLICY IF EXISTS "Teachers can view timetable for assigned sections" ON public.timetable_entries;

CREATE POLICY "Teachers can view timetable for assigned sections"
ON public.timetable_entries
FOR SELECT
USING (
  teacher_user_id = auth.uid() 
  OR is_teacher_assigned(school_id, class_section_id) 
  OR can_manage_students(school_id)
);