-- Function to notify parents when a student is marked absent
CREATE OR REPLACE FUNCTION public.notify_parent_on_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student RECORD;
  v_session RECORD;
  v_guardian RECORD;
  v_section_name TEXT;
  v_class_name TEXT;
BEGIN
  -- Only trigger for absent status
  IF NEW.status != 'absent' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if this is an update and the status hasn't changed to absent
  IF TG_OP = 'UPDATE' AND OLD.status = 'absent' THEN
    RETURN NEW;
  END IF;

  -- Get student info
  SELECT id, first_name, last_name, school_id INTO v_student
  FROM public.students
  WHERE id = NEW.student_id;
  
  IF v_student IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get session info
  SELECT session_date, period_label, class_section_id INTO v_session
  FROM public.attendance_sessions
  WHERE id = NEW.session_id;
  
  IF v_session IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get class and section name for context
  SELECT cs.name, ac.name INTO v_section_name, v_class_name
  FROM public.class_sections cs
  JOIN public.academic_classes ac ON ac.id = cs.class_id
  WHERE cs.id = v_session.class_section_id;

  -- Notify all guardians of this student
  FOR v_guardian IN 
    SELECT sg.user_id 
    FROM public.student_guardians sg
    WHERE sg.student_id = NEW.student_id
  LOOP
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
      'alert',
      'Absence Notification',
      v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
        ' was marked absent on ' || TO_CHAR(v_session.session_date, 'Mon DD, YYYY') || 
        ' during ' || v_session.period_label ||
        CASE WHEN v_class_name IS NOT NULL THEN ' (' || v_class_name || ' - ' || v_section_name || ')' ELSE '' END,
      'attendance',
      NEW.id::text,
      NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on attendance_entries
DROP TRIGGER IF EXISTS trg_notify_parent_on_absence ON public.attendance_entries;
CREATE TRIGGER trg_notify_parent_on_absence
  AFTER INSERT OR UPDATE ON public.attendance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_absence();