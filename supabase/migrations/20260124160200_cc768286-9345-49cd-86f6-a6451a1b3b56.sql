-- Fix: Allow teachers to create assessments for their assigned sections
-- Current policy requires teacher_subject_assignments which is too restrictive
-- Teachers assigned to a section via teacher_assignments should be able to create assessments

DROP POLICY IF EXISTS "Teachers can create assessments for assigned subject" ON public.academic_assessments;

CREATE POLICY "Teachers can create assessments for assigned sections"
ON public.academic_assessments
FOR INSERT
WITH CHECK (
  can_manage_students(school_id) 
  OR (
    teacher_user_id = auth.uid()
    AND is_teacher_assigned(school_id, class_section_id)
  )
);

-- Also update the UPDATE policy to match
DROP POLICY IF EXISTS "Teachers can update own assessments" ON public.academic_assessments;

CREATE POLICY "Teachers can update own assessments"
ON public.academic_assessments
FOR UPDATE
USING (can_manage_students(school_id) OR teacher_user_id = auth.uid())
WITH CHECK (
  can_manage_students(school_id) 
  OR (
    teacher_user_id = auth.uid()
    AND is_teacher_assigned(school_id, class_section_id)
  )
);