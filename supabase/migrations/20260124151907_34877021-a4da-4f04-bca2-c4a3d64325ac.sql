-- Create lesson_plans table for teachers to plan their lessons
CREATE TABLE public.lesson_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  plan_date date NOT NULL,
  period_label text DEFAULT '',
  topic text NOT NULL,
  objectives text,
  resources text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(school_id, teacher_user_id, class_section_id, plan_date, period_label)
);

-- Enable RLS
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can manage own lesson plans"
ON public.lesson_plans FOR ALL
USING (teacher_user_id = auth.uid() OR can_manage_students(school_id))
WITH CHECK (teacher_user_id = auth.uid() OR can_manage_students(school_id));

CREATE POLICY "Teachers can view lesson plans for assigned sections"
ON public.lesson_plans FOR SELECT
USING (is_teacher_assigned(school_id, class_section_id) OR can_manage_students(school_id));

-- Create at_risk_students view for analytics (students with low attendance or declining grades)
CREATE OR REPLACE VIEW public.at_risk_students AS
SELECT 
  s.id as student_id,
  s.school_id,
  s.first_name,
  s.last_name,
  se.class_section_id,
  COALESCE(att.attendance_rate, 100) as attendance_rate,
  COALESCE(att.total_sessions, 0) as total_sessions,
  COALESCE(grades.avg_percentage, 0) as avg_grade_percentage,
  COALESCE(grades.recent_avg, 0) as recent_grade_avg,
  CASE 
    WHEN COALESCE(att.attendance_rate, 100) < 75 THEN true
    WHEN COALESCE(grades.recent_avg, 100) < 50 THEN true
    WHEN COALESCE(grades.avg_percentage, 100) - COALESCE(grades.recent_avg, 100) > 15 THEN true
    ELSE false
  END as is_at_risk,
  CASE 
    WHEN COALESCE(att.attendance_rate, 100) < 75 THEN 'Low Attendance'
    WHEN COALESCE(grades.recent_avg, 100) < 50 THEN 'Low Grades'
    WHEN COALESCE(grades.avg_percentage, 100) - COALESCE(grades.recent_avg, 100) > 15 THEN 'Declining Grades'
    ELSE NULL
  END as risk_reason
FROM public.students s
JOIN public.student_enrollments se ON se.student_id = s.id AND se.school_id = s.school_id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) FILTER (WHERE ae.status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0) as attendance_rate,
    COUNT(*) as total_sessions
  FROM public.attendance_entries ae
  JOIN public.attendance_sessions asess ON asess.id = ae.session_id
  WHERE ae.student_id = s.id 
    AND ae.school_id = s.school_id
    AND asess.class_section_id = se.class_section_id
) att ON true
LEFT JOIN LATERAL (
  SELECT 
    AVG(sm.marks * 100.0 / NULLIF(aa.max_marks, 0)) as avg_percentage,
    AVG(CASE WHEN aa.assessment_date > CURRENT_DATE - INTERVAL '30 days' 
        THEN sm.marks * 100.0 / NULLIF(aa.max_marks, 0) END) as recent_avg
  FROM public.student_marks sm
  JOIN public.academic_assessments aa ON aa.id = sm.assessment_id
  WHERE sm.student_id = s.id 
    AND sm.school_id = s.school_id
    AND aa.class_section_id = se.class_section_id
) grades ON true;

-- Add updated_at trigger
CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();