-- Helper function: my_children(_school_id uuid) RETURNS SETOF uuid
-- Returns student IDs where current user is linked via student_guardians.user_id
CREATE OR REPLACE FUNCTION public.my_children(_school_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sg.student_id
  FROM student_guardians sg
  JOIN students s ON s.id = sg.student_id
  WHERE sg.user_id = auth.uid()
    AND s.school_id = _school_id;
$$;

-- Helper function: is_my_child(_school_id uuid, _student_id uuid) RETURNS boolean
CREATE OR REPLACE FUNCTION public.is_my_child(_school_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_guardians sg
    JOIN students s ON s.id = sg.student_id
    WHERE sg.user_id = auth.uid()
      AND sg.student_id = _student_id
      AND s.school_id = _school_id
  );
$$;

-- Create parent_notifications table
CREATE TABLE public.parent_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  parent_user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on parent_notifications
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_notifications
CREATE POLICY "Parents can view own notifications"
ON public.parent_notifications
FOR SELECT
USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can update own notifications (mark read)"
ON public.parent_notifications
FOR UPDATE
USING (parent_user_id = auth.uid());

CREATE POLICY "Staff managers can create notifications"
ON public.parent_notifications
FOR INSERT
WITH CHECK (can_manage_students(school_id));

CREATE POLICY "Staff managers can view all notifications"
ON public.parent_notifications
FOR SELECT
USING (can_manage_students(school_id));

-- Enable realtime for parent_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_notifications;

-- RLS policies for parents to read their children's data

-- Parents can view own children's attendance entries
CREATE POLICY "Parents can view own children attendance entries"
ON public.attendance_entries
FOR SELECT
USING (is_my_child(school_id, student_id));

-- Parents can view own children's student marks
CREATE POLICY "Parents can view own children student marks"
ON public.student_marks
FOR SELECT
USING (is_my_child(school_id, student_id));

-- Parents can view own children's finance invoices
CREATE POLICY "Parents can view own children finance invoices"
ON public.finance_invoices
FOR SELECT
USING (is_my_child(school_id, student_id));

-- Parents can view own children's certificates
CREATE POLICY "Parents can view own children certificates"
ON public.student_certificates
FOR SELECT
USING (is_my_child(school_id, student_id));

-- Parents can view assignments for their children's sections
CREATE POLICY "Parents can view assignments for own children sections"
ON public.assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM student_enrollments se
  WHERE se.student_id IN (SELECT my_children(assignments.school_id))
    AND se.class_section_id = assignments.class_section_id
));

-- Parents can view homework for their children's sections
CREATE POLICY "Parents can view homework for own children sections"
ON public.homework
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM student_enrollments se
  WHERE se.student_id IN (SELECT my_children(homework.school_id))
    AND se.class_section_id = homework.class_section_id
));

-- Parents can view attendance sessions for their children's sections
CREATE POLICY "Parents can view attendance sessions for own children"
ON public.attendance_sessions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM student_enrollments se
  WHERE se.student_id IN (SELECT my_children(attendance_sessions.school_id))
    AND se.class_section_id = attendance_sessions.class_section_id
));

-- Parents can view timetable entries for their children's sections
CREATE POLICY "Parents can view timetable for own children sections"
ON public.timetable_entries
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM student_enrollments se
  WHERE se.student_id IN (SELECT my_children(timetable_entries.school_id))
    AND se.class_section_id = timetable_entries.class_section_id
));

-- Parents can view assessments for their children's sections
CREATE POLICY "Parents can view assessments for own children sections"
ON public.academic_assessments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM student_enrollments se
  WHERE se.student_id IN (SELECT my_children(academic_assessments.school_id))
    AND se.class_section_id = academic_assessments.class_section_id
));

-- Parents can view own children's student record (limited fields via RLS)
CREATE POLICY "Parents can view own children students"
ON public.students
FOR SELECT
USING (is_my_child(school_id, id));

-- Parents can view own children's enrollments
CREATE POLICY "Parents can view own children enrollments"
ON public.student_enrollments
FOR SELECT
USING (is_my_child(school_id, student_id));