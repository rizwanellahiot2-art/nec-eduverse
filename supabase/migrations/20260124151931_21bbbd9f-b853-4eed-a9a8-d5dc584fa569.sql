-- Fix the security definer view by using a security invoker function instead
DROP VIEW IF EXISTS public.at_risk_students;

-- Create a function that respects RLS instead of a view
CREATE OR REPLACE FUNCTION public.get_at_risk_students(_school_id uuid, _class_section_id uuid DEFAULT NULL)
RETURNS TABLE(
  student_id uuid,
  school_id uuid,
  first_name text,
  last_name text,
  class_section_id uuid,
  attendance_rate numeric,
  total_sessions bigint,
  avg_grade_percentage numeric,
  recent_grade_avg numeric,
  is_at_risk boolean,
  risk_reason text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
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
  ) grades ON true
  WHERE s.school_id = _school_id
    AND (_class_section_id IS NULL OR se.class_section_id = _class_section_id)
    AND (
      COALESCE(att.attendance_rate, 100) < 75
      OR COALESCE(grades.recent_avg, 100) < 50
      OR (COALESCE(grades.avg_percentage, 100) - COALESCE(grades.recent_avg, 100) > 15)
    );
$$;