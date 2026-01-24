-- Add full-text search to admin_messages
CREATE INDEX IF NOT EXISTS idx_admin_messages_content_search 
ON public.admin_messages USING GIN (to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_admin_messages_subject_search 
ON public.admin_messages USING GIN (to_tsvector('english', coalesce(subject, '')));

-- Create a function for full-text search of messages
CREATE OR REPLACE FUNCTION public.search_messages(
  _school_id uuid,
  _user_id uuid,
  _query text,
  _limit int DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  subject text,
  content text,
  sender_user_id uuid,
  created_at timestamptz,
  is_sent boolean,
  relevance real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_messages AS (
    -- Messages sent by user
    SELECT 
      m.id,
      m.subject,
      m.content,
      m.sender_user_id,
      m.created_at,
      true as is_sent,
      ts_rank(to_tsvector('english', m.content || ' ' || coalesce(m.subject, '')), plainto_tsquery('english', _query)) as relevance
    FROM admin_messages m
    WHERE m.school_id = _school_id
      AND m.sender_user_id = _user_id
      AND (
        to_tsvector('english', m.content) @@ plainto_tsquery('english', _query)
        OR to_tsvector('english', coalesce(m.subject, '')) @@ plainto_tsquery('english', _query)
      )
    
    UNION ALL
    
    -- Messages received by user
    SELECT 
      m.id,
      m.subject,
      m.content,
      m.sender_user_id,
      m.created_at,
      false as is_sent,
      ts_rank(to_tsvector('english', m.content || ' ' || coalesce(m.subject, '')), plainto_tsquery('english', _query)) as relevance
    FROM admin_messages m
    JOIN admin_message_recipients r ON r.message_id = m.id
    WHERE m.school_id = _school_id
      AND r.recipient_user_id = _user_id
      AND (
        to_tsvector('english', m.content) @@ plainto_tsquery('english', _query)
        OR to_tsvector('english', coalesce(m.subject, '')) @@ plainto_tsquery('english', _query)
      )
  )
  SELECT DISTINCT ON (um.id) 
    um.id, um.subject, um.content, um.sender_user_id, um.created_at, um.is_sent, um.relevance
  FROM user_messages um
  ORDER BY um.id, um.relevance DESC, um.created_at DESC
  LIMIT _limit;
$$;

-- Create helper function to check if user can message target
CREATE OR REPLACE FUNCTION public.can_message_user(
  _school_id uuid,
  _sender_id uuid,
  _recipient_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role text;
  recipient_role text;
BEGIN
  -- Get sender's role (prioritize staff roles over student)
  SELECT role::text INTO sender_role
  FROM user_roles
  WHERE school_id = _school_id AND user_id = _sender_id
  ORDER BY CASE 
    WHEN role IN ('principal', 'vice_principal', 'super_admin', 'school_owner') THEN 1
    WHEN role IN ('teacher', 'accountant', 'hr_manager', 'marketing_staff', 'counselor', 'academic_coordinator') THEN 2
    WHEN role = 'parent' THEN 3
    WHEN role = 'student' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  -- Get recipient's role
  SELECT role::text INTO recipient_role
  FROM user_roles
  WHERE school_id = _school_id AND user_id = _recipient_id
  ORDER BY CASE 
    WHEN role IN ('principal', 'vice_principal', 'super_admin', 'school_owner') THEN 1
    WHEN role IN ('teacher', 'accountant', 'hr_manager', 'marketing_staff', 'counselor', 'academic_coordinator') THEN 2
    WHEN role = 'parent' THEN 3
    WHEN role = 'student' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  -- If sender is student, they can only message teachers/principals (staff)
  IF sender_role = 'student' THEN
    RETURN recipient_role IN ('teacher', 'principal', 'vice_principal', 'super_admin', 'school_owner', 'academic_coordinator', 'counselor');
  END IF;
  
  -- All other roles can message anyone
  RETURN true;
END;
$$;