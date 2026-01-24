-- Add low grade threshold to parent notification preferences
ALTER TABLE public.parent_notification_preferences 
ADD COLUMN IF NOT EXISTS low_grade_threshold numeric DEFAULT 60;

-- Create trigger function to notify parents on low grades
CREATE OR REPLACE FUNCTION public.notify_parent_on_low_grade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student RECORD;
  v_assessment RECORD;
  v_guardian RECORD;
  v_prefs RECORD;
  v_percentage NUMERIC;
  v_section_name TEXT;
  v_class_name TEXT;
  v_subject_name TEXT;
BEGIN
  -- Only trigger if marks is set
  IF NEW.marks IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get assessment info
  SELECT a.*, s.name as subject_name INTO v_assessment
  FROM public.academic_assessments a
  LEFT JOIN public.subjects s ON s.id = a.subject_id
  WHERE a.id = NEW.assessment_id;
  
  IF v_assessment IS NULL OR v_assessment.max_marks IS NULL OR v_assessment.max_marks <= 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate percentage
  v_percentage := (NEW.marks / v_assessment.max_marks) * 100;

  -- Get student info
  SELECT id, first_name, last_name, school_id INTO v_student
  FROM public.students
  WHERE id = NEW.student_id;
  
  IF v_student IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get class and section name for context
  SELECT cs.name, ac.name INTO v_section_name, v_class_name
  FROM public.class_sections cs
  JOIN public.academic_classes ac ON ac.id = cs.class_id
  WHERE cs.id = v_assessment.class_section_id;

  v_subject_name := COALESCE(v_assessment.subject_name, 'Assessment');

  -- Notify all guardians of this student (respecting preferences)
  FOR v_guardian IN 
    SELECT sg.user_id 
    FROM public.student_guardians sg
    WHERE sg.student_id = NEW.student_id
      AND sg.user_id IS NOT NULL
  LOOP
    -- Check notification preferences
    SELECT * INTO v_prefs
    FROM public.parent_notification_preferences
    WHERE user_id = v_guardian.user_id
      AND student_id = NEW.student_id;
    
    -- Check if grade notifications are enabled and if grade is below threshold
    -- Default threshold is 60% if not set
    IF v_prefs IS NULL THEN
      -- No preferences set, default to notify if below 60%
      IF v_percentage < 60 THEN
        INSERT INTO public.app_notifications (
          school_id,
          user_id,
          type,
          title,
          body,
          entity_type,
          entity_id,
          created_by
        ) VALUES (
          NEW.school_id,
          v_guardian.user_id,
          'warning',
          'Low Grade Alert',
          v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
            ' received ' || ROUND(v_percentage, 1) || '% in ' || v_assessment.title ||
            ' (' || v_subject_name || ')' ||
            CASE WHEN v_class_name IS NOT NULL THEN ' - ' || v_class_name || ' ' || v_section_name ELSE '' END,
          'grade',
          NEW.id::text,
          NEW.created_by
        );
      END IF;
    ELSIF v_prefs.notify_grades AND v_percentage < COALESCE(v_prefs.low_grade_threshold, 60) THEN
      INSERT INTO public.app_notifications (
        school_id,
        user_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        created_by
      ) VALUES (
        NEW.school_id,
        v_guardian.user_id,
        'warning',
        'Low Grade Alert',
        v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
          ' received ' || ROUND(v_percentage, 1) || '% in ' || v_assessment.title ||
          ' (' || v_subject_name || ')' ||
          CASE WHEN v_class_name IS NOT NULL THEN ' - ' || v_class_name || ' ' || v_section_name ELSE '' END,
        'grade',
        NEW.id::text,
        NEW.created_by
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on student_marks
DROP TRIGGER IF EXISTS trg_notify_parent_on_low_grade ON public.student_marks;
CREATE TRIGGER trg_notify_parent_on_low_grade
AFTER INSERT OR UPDATE OF marks ON public.student_marks
FOR EACH ROW
EXECUTE FUNCTION public.notify_parent_on_low_grade();