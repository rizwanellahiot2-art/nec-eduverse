-- Create a junction table to track message recipients
CREATE TABLE public.admin_message_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_message_recipients ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_admin_message_recipients_message ON public.admin_message_recipients(message_id);
CREATE INDEX idx_admin_message_recipients_recipient ON public.admin_message_recipients(recipient_user_id);

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their own message recipients"
ON public.admin_message_recipients
FOR SELECT
USING (
  recipient_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.admin_messages 
    WHERE admin_messages.id = admin_message_recipients.message_id 
    AND admin_messages.sender_user_id = auth.uid()
  )
);

-- Policy: Admins can insert recipients when sending messages
CREATE POLICY "Authenticated users can insert message recipients"
ON public.admin_message_recipients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_messages 
    WHERE admin_messages.id = admin_message_recipients.message_id 
    AND admin_messages.sender_user_id = auth.uid()
  )
);

-- Policy: Recipients can update their read status
CREATE POLICY "Recipients can update their read status"
ON public.admin_message_recipients
FOR UPDATE
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

-- Enable realtime for message recipients
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_message_recipients;