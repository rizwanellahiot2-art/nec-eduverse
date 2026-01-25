-- Create trigger function to notify recipients when a message is sent
CREATE OR REPLACE FUNCTION public.notify_on_admin_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_message RECORD;
  v_sender_name TEXT;
BEGIN
  -- Get the message details
  SELECT m.*, p.display_name as sender_name
  INTO v_message
  FROM public.admin_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_user_id
  WHERE m.id = NEW.message_id;
  
  IF v_message IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get sender name, fallback to 'Someone' if not found
  v_sender_name := COALESCE(v_message.sender_name, 'Someone');
  
  -- Create notification for the recipient
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
    v_message.school_id,
    NEW.recipient_user_id,
    'message',
    'New Message from ' || v_sender_name,
    CASE 
      WHEN v_message.subject IS NOT NULL AND v_message.subject != '' 
      THEN v_sender_name || ': ' || v_message.subject
      ELSE v_sender_name || ': ' || LEFT(v_message.content, 100) || CASE WHEN LENGTH(v_message.content) > 100 THEN '...' ELSE '' END
    END,
    'admin_message',
    v_message.id::text,
    v_message.sender_user_id
  );

  RETURN NEW;
END;
$function$;

-- Create the trigger on admin_message_recipients
DROP TRIGGER IF EXISTS trigger_notify_on_admin_message ON public.admin_message_recipients;
CREATE TRIGGER trigger_notify_on_admin_message
  AFTER INSERT ON public.admin_message_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_admin_message();