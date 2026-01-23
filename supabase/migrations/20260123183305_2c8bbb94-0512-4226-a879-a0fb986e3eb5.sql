-- Behavior notes table for teacher observations
CREATE TABLE public.behavior_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'observation', -- observation, positive, concern, incident
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_shared_with_parents BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own behavior notes"
  ON public.behavior_notes FOR SELECT
  USING (teacher_user_id = auth.uid() OR can_manage_students(school_id));

CREATE POLICY "Teachers can create behavior notes for assigned students"
  ON public.behavior_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN teacher_assignments ta ON ta.school_id = se.school_id AND ta.class_section_id = se.class_section_id
      WHERE se.student_id = behavior_notes.student_id
        AND ta.teacher_user_id = auth.uid()
    ) OR can_manage_students(school_id)
  );

CREATE POLICY "Teachers can update own behavior notes"
  ON public.behavior_notes FOR UPDATE
  USING (teacher_user_id = auth.uid() OR can_manage_students(school_id));

CREATE POLICY "Teachers can delete own behavior notes"
  ON public.behavior_notes FOR DELETE
  USING (teacher_user_id = auth.uid() OR can_manage_staff(school_id));

-- Homework assignments table
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  class_section_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  attachment_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view homework for assigned sections"
  ON public.homework FOR SELECT
  USING (is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

CREATE POLICY "Teachers can create homework for assigned sections"
  ON public.homework FOR INSERT
  WITH CHECK (is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

CREATE POLICY "Teachers can update own homework"
  ON public.homework FOR UPDATE
  USING (teacher_user_id = auth.uid() OR can_manage_students(school_id));

CREATE POLICY "Teachers can delete own homework"
  ON public.homework FOR DELETE
  USING (teacher_user_id = auth.uid() OR can_manage_staff(school_id));

-- Assignments (graded work)
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  class_section_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  weightage NUMERIC NOT NULL DEFAULT 1.0,
  due_date DATE,
  assignment_type TEXT NOT NULL DEFAULT 'assignment', -- assignment, quiz, test, project
  status TEXT NOT NULL DEFAULT 'active',
  attachment_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view assignments for assigned sections"
  ON public.assignments FOR SELECT
  USING (is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

CREATE POLICY "Teachers can create assignments for assigned sections"
  ON public.assignments FOR INSERT
  WITH CHECK (is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

CREATE POLICY "Teachers can update own assignments"
  ON public.assignments FOR UPDATE
  USING (teacher_user_id = auth.uid() OR can_manage_students(school_id));

CREATE POLICY "Teachers can delete own assignments"
  ON public.assignments FOR DELETE
  USING (teacher_user_id = auth.uid() OR can_manage_staff(school_id));

-- Student results/grades
CREATE TABLE public.student_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  marks_obtained NUMERIC,
  grade TEXT,
  remarks TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view results for assigned sections"
  ON public.student_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_results.assignment_id
        AND (is_teacher_assigned(a.school_id, a.class_section_id) OR can_manage_students(a.school_id))
    )
  );

CREATE POLICY "Teachers can manage results for assigned sections"
  ON public.student_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_results.assignment_id
        AND (is_teacher_assigned(a.school_id, a.class_section_id) OR can_manage_students(a.school_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = student_results.assignment_id
        AND (is_teacher_assigned(a.school_id, a.class_section_id) OR can_manage_students(a.school_id))
    )
  );

-- Parent-teacher messages
CREATE TABLE public.parent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID, -- for threading
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.parent_messages FOR SELECT
  USING (sender_user_id = auth.uid() OR recipient_user_id = auth.uid() OR can_manage_staff(school_id));

CREATE POLICY "Users can send messages"
  ON public.parent_messages FOR INSERT
  WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "Recipients can update messages (mark read)"
  ON public.parent_messages FOR UPDATE
  USING (recipient_user_id = auth.uid());

-- Student parents/guardians
CREATE TABLE public.student_guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  user_id UUID, -- optional, if parent has account
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'parent', -- parent, guardian, mother, father, etc.
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view guardians for assigned students"
  ON public.student_guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN teacher_assignments ta ON ta.school_id = se.school_id AND ta.class_section_id = se.class_section_id
      WHERE se.student_id = student_guardians.student_id AND ta.teacher_user_id = auth.uid()
    ) OR can_manage_students(school_id)
  );

CREATE POLICY "Teachers can manage guardians for assigned students"
  ON public.student_guardians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN teacher_assignments ta ON ta.school_id = se.school_id AND ta.class_section_id = se.class_section_id
      WHERE se.student_id = student_guardians.student_id AND ta.teacher_user_id = auth.uid()
    ) OR can_manage_students(school_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN teacher_assignments ta ON ta.school_id = se.school_id AND ta.class_section_id = se.class_section_id
      WHERE se.student_id = student_guardians.student_id AND ta.teacher_user_id = auth.uid()
    ) OR can_manage_students(school_id)
  );

-- Timetable entries
CREATE TABLE public.timetable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  class_section_id UUID NOT NULL,
  teacher_user_id UUID,
  subject_name TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view timetable for assigned sections"
  ON public.timetable_entries FOR SELECT
  USING (teacher_user_id = auth.uid() OR is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

CREATE POLICY "Student managers can manage timetable"
  ON public.timetable_entries FOR ALL
  USING (can_manage_students(school_id))
  WITH CHECK (can_manage_students(school_id));

-- Admin messages (teacher to admin)
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view admin messages"
  ON public.admin_messages FOR SELECT
  USING (sender_user_id = auth.uid() OR can_manage_staff(school_id));

CREATE POLICY "School members can send admin messages"
  ON public.admin_messages FOR INSERT
  WITH CHECK (is_school_member(school_id));

CREATE POLICY "Staff managers can update admin messages"
  ON public.admin_messages FOR UPDATE
  USING (can_manage_staff(school_id) OR sender_user_id = auth.uid());

-- Create updated_at triggers for all new tables
CREATE TRIGGER update_behavior_notes_updated_at
  BEFORE UPDATE ON public.behavior_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_results_updated_at
  BEFORE UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_guardians_updated_at
  BEFORE UPDATE ON public.student_guardians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timetable_entries_updated_at
  BEFORE UPDATE ON public.timetable_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_messages_updated_at
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();