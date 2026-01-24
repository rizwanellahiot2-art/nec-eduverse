-- Add attachment_urls column to admin_messages for file attachments
ALTER TABLE public.admin_messages 
ADD COLUMN attachment_urls text[] DEFAULT '{}'::text[];

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 
  'message-attachments', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
-- Users can upload to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view attachments if they sent or received the message
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    -- Owner of the folder
    auth.uid()::text = (storage.foldername(name))[1]
    -- Or is a recipient of a message containing this attachment
    OR EXISTS (
      SELECT 1 FROM public.admin_message_recipients amr
      JOIN public.admin_messages am ON am.id = amr.message_id
      WHERE amr.recipient_user_id = auth.uid()
        AND name = ANY(am.attachment_urls)
    )
  )
);

-- Users can delete their own uploaded attachments
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);