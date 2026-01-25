-- Table for scheduling messages to be sent later
CREATE TABLE public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  recipient_user_ids uuid[] NOT NULL,
  subject text,
  content text NOT NULL,
  attachment_urls text[] DEFAULT '{}'::text[],
  scheduled_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled', 'failed'
  sent_at timestamp with time zone,
  error_message text,
  message_type text NOT NULL DEFAULT 'admin', -- 'admin' for admin_messages, 'parent' for parent_messages
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and manage their own scheduled messages
CREATE POLICY "Users can view own scheduled messages"
ON public.scheduled_messages FOR SELECT
USING (sender_user_id = auth.uid());

CREATE POLICY "Users can create scheduled messages"
ON public.scheduled_messages FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid() 
  AND school_id IS NOT NULL 
  AND is_school_member(school_id)
);

CREATE POLICY "Users can update own scheduled messages"
ON public.scheduled_messages FOR UPDATE
USING (sender_user_id = auth.uid())
WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "Users can delete own scheduled messages"
ON public.scheduled_messages FOR DELETE
USING (sender_user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table to track cleared conversations (soft-delete for "clear for me")
CREATE TABLE public.cleared_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  partner_user_id uuid NOT NULL,
  cleared_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id, partner_user_id)
);

-- Enable RLS
ALTER TABLE public.cleared_conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own cleared conversations"
ON public.cleared_conversations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can clear conversations"
ON public.cleared_conversations FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_school_member(school_id));

CREATE POLICY "Users can undelete conversations"
ON public.cleared_conversations FOR DELETE
USING (user_id = auth.uid());