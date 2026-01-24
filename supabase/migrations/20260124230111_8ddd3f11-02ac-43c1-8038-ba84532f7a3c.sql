-- Add reply_to_id column to support message threading
ALTER TABLE public.admin_messages
ADD COLUMN reply_to_id uuid REFERENCES public.admin_messages(id) ON DELETE SET NULL;

-- Create index for efficient thread lookups
CREATE INDEX idx_admin_messages_reply_to ON public.admin_messages(reply_to_id);

-- Add a comment describing the column
COMMENT ON COLUMN public.admin_messages.reply_to_id IS 'References the parent message for threading/replies';