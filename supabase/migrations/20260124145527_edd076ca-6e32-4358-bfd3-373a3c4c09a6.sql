-- Create parent notification preferences table
CREATE TABLE IF NOT EXISTS public.parent_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  notify_absent BOOLEAN NOT NULL DEFAULT true,
  notify_late BOOLEAN NOT NULL DEFAULT true,
  notify_grades BOOLEAN NOT NULL DEFAULT true,
  notify_homework BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Parents can view and manage their own preferences
CREATE POLICY "Parents can view own preferences"
  ON public.parent_notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Parents can insert own preferences"
  ON public.parent_notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_my_child(school_id, student_id));

CREATE POLICY "Parents can update own preferences"
  ON public.parent_notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parents can delete own preferences"
  ON public.parent_notification_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_parent_notification_preferences_updated_at
  BEFORE UPDATE ON public.parent_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the notify function to handle both absent and late, and check preferences
CREATE OR REPLACE FUNCTION public.notify_parent_on_attendance()
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
  v_prefs RECORD;
  v_should_notify BOOLEAN;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
BEGIN
  -- Only trigger for absent or late status
  IF NEW.status NOT IN ('absent', 'late') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if this is an update and the status hasn't changed
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
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

  -- Prepare notification content based on status
  IF NEW.status = 'absent' THEN
    v_title := 'Absence Notification';
    v_body := v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
      ' was marked absent on ' || TO_CHAR(v_session.session_date, 'Mon DD, YYYY') || 
      ' during ' || v_session.period_label;
    v_type := 'alert';
  ELSE -- late
    v_title := 'Late Arrival Notification';
    v_body := v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
      ' arrived late on ' || TO_CHAR(v_session.session_date, 'Mon DD, YYYY') || 
      ' during ' || v_session.period_label;
    v_type := 'warning';
  END IF;

  -- Add class info if available
  IF v_class_name IS NOT NULL THEN
    v_body := v_body || ' (' || v_class_name || ' - ' || v_section_name || ')';
  END IF;

  -- Notify all guardians of this student (respecting preferences)
  FOR v_guardian IN 
    SELECT sg.user_id 
    FROM public.student_guardians sg
    WHERE sg.student_id = NEW.student_id
  LOOP
    -- Check notification preferences (default to true if no preferences set)
    SELECT * INTO v_prefs
    FROM public.parent_notification_preferences
    WHERE user_id = v_guardian.user_id
      AND student_id = NEW.student_id;
    
    -- Determine if we should notify based on preferences
    IF v_prefs IS NULL THEN
      -- No preferences set, default to notify
      v_should_notify := true;
    ELSIF NEW.status = 'absent' THEN
      v_should_notify := v_prefs.notify_absent;
    ELSE -- late
      v_should_notify := v_prefs.notify_late;
    END IF;

    IF v_should_notify THEN
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
        v_type,
        v_title,
        v_body,
        'attendance',
        NEW.id::text,
        NEW.created_by
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trg_notify_parent_on_absence ON public.attendance_entries;
DROP TRIGGER IF EXISTS trg_notify_parent_on_attendance ON public.attendance_entries;

CREATE TRIGGER trg_notify_parent_on_attendance
  AFTER INSERT OR UPDATE ON public.attendance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_attendance();