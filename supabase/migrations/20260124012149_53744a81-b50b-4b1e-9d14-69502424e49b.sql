-- Add term + publish controls to assessments
ALTER TABLE public.academic_assessments
ADD COLUMN IF NOT EXISTS term_label text;

ALTER TABLE public.academic_assessments
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

ALTER TABLE public.academic_assessments
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Keep published_at in sync with is_published
CREATE OR REPLACE FUNCTION public.set_assessment_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    IF NEW.is_published THEN
      NEW.published_at := COALESCE(NEW.published_at, now());
    ELSE
      NEW.published_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessments_set_published_at ON public.academic_assessments;
CREATE TRIGGER trg_assessments_set_published_at
BEFORE UPDATE ON public.academic_assessments
FOR EACH ROW
EXECUTE FUNCTION public.set_assessment_published_at();

-- Update student/parent mark visibility to only published assessments
DROP POLICY IF EXISTS "Parents can view own children student marks" ON public.student_marks;
CREATE POLICY "Parents can view own children student marks"
ON public.student_marks
FOR SELECT
USING (
  is_my_child(school_id, student_id)
  AND EXISTS (
    SELECT 1
    FROM public.academic_assessments a
    WHERE a.school_id = student_marks.school_id
      AND a.id = student_marks.assessment_id
      AND a.is_published = true
  )
);

DROP POLICY IF EXISTS "Students can view own marks" ON public.student_marks;
CREATE POLICY "Students can view own marks"
ON public.student_marks
FOR SELECT
USING (
  is_my_student(school_id, student_id)
  AND EXISTS (
    SELECT 1
    FROM public.academic_assessments a
    WHERE a.school_id = student_marks.school_id
      AND a.id = student_marks.assessment_id
      AND a.is_published = true
  )
);

-- (Other policies on student_marks remain unchanged)
