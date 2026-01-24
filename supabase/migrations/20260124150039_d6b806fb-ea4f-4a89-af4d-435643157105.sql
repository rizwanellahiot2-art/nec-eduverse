-- Create grade thresholds table for per-school grade configuration
CREATE TABLE public.grade_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  grade_label TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  grade_points NUMERIC DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (school_id, grade_label)
);

-- Enable RLS
ALTER TABLE public.grade_thresholds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view grade thresholds"
ON public.grade_thresholds FOR SELECT
USING (is_school_member(school_id));

CREATE POLICY "Staff managers can manage grade thresholds"
ON public.grade_thresholds FOR ALL
USING (can_manage_staff(school_id))
WITH CHECK (can_manage_staff(school_id));

-- Function to calculate grade based on percentage
CREATE OR REPLACE FUNCTION public.calculate_grade(p_school_id UUID, p_percentage NUMERIC)
RETURNS TABLE(grade_label TEXT, grade_points NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT gt.grade_label, gt.grade_points
  FROM public.grade_thresholds gt
  WHERE gt.school_id = p_school_id
    AND p_percentage >= gt.min_percentage
    AND p_percentage <= gt.max_percentage
  ORDER BY gt.sort_order
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add computed_grade column to student_marks
ALTER TABLE public.student_marks 
ADD COLUMN IF NOT EXISTS computed_grade TEXT,
ADD COLUMN IF NOT EXISTS grade_points NUMERIC;

-- Trigger to auto-calculate grade on marks insert/update
CREATE OR REPLACE FUNCTION public.auto_calculate_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_max_marks NUMERIC;
  v_percentage NUMERIC;
  v_grade RECORD;
BEGIN
  -- Get max marks from assessment
  SELECT max_marks INTO v_max_marks
  FROM public.academic_assessments
  WHERE id = NEW.assessment_id;
  
  IF v_max_marks IS NOT NULL AND v_max_marks > 0 AND NEW.marks IS NOT NULL THEN
    v_percentage := (NEW.marks / v_max_marks) * 100;
    
    SELECT * INTO v_grade
    FROM public.calculate_grade(NEW.school_id, v_percentage);
    
    NEW.computed_grade := v_grade.grade_label;
    NEW.grade_points := v_grade.grade_points;
  ELSE
    NEW.computed_grade := NULL;
    NEW.grade_points := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_calculate_grade
BEFORE INSERT OR UPDATE OF marks ON public.student_marks
FOR EACH ROW
EXECUTE FUNCTION public.auto_calculate_grade();