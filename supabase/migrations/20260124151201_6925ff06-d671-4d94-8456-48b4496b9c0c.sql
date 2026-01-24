-- Fix the notify_parent_on_attendance trigger to handle null user_ids
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
      ' during ' || COALESCE(v_session.period_label, 'class');
    v_type := 'alert';
  ELSE -- late
    v_title := 'Late Arrival Notification';
    v_body := v_student.first_name || ' ' || COALESCE(v_student.last_name, '') || 
      ' arrived late on ' || TO_CHAR(v_session.session_date, 'Mon DD, YYYY') || 
      ' during ' || COALESCE(v_session.period_label, 'class');
    v_type := 'warning';
  END IF;

  -- Add class info if available
  IF v_class_name IS NOT NULL THEN
    v_body := v_body || ' (' || v_class_name || ' - ' || v_section_name || ')';
  END IF;

  -- Notify all guardians of this student (respecting preferences)
  -- IMPORTANT: Only select guardians with non-null user_id
  FOR v_guardian IN 
    SELECT sg.user_id 
    FROM public.student_guardians sg
    WHERE sg.student_id = NEW.student_id
      AND sg.user_id IS NOT NULL
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

-- Also fix the old notify_parent_on_absence function if it's still being used
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

  -- Notify all guardians of this student (only those with non-null user_id)
  FOR v_guardian IN 
    SELECT sg.user_id 
    FROM public.student_guardians sg
    WHERE sg.student_id = NEW.student_id
      AND sg.user_id IS NOT NULL
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
        ' during ' || COALESCE(v_session.period_label, 'class') ||
        CASE WHEN v_class_name IS NOT NULL THEN ' (' || v_class_name || ' - ' || v_section_name || ')' ELSE '' END,
      'attendance',
      NEW.id::text,
      NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$function$;