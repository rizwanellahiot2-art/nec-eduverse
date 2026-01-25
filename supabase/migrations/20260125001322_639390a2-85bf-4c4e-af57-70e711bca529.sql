-- Add DELETE policy for admin_message_recipients
-- Allow users to delete their own recipient records (for conversation cleanup)
CREATE POLICY "Recipients can delete their own message links"
  ON public.admin_message_recipients
  FOR DELETE
  USING (recipient_user_id = auth.uid());

-- Also allow senders to delete recipient links for their messages
CREATE POLICY "Senders can delete recipients of own messages"
  ON public.admin_message_recipients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_messages
      WHERE admin_messages.id = admin_message_recipients.message_id
        AND admin_messages.sender_user_id = auth.uid()
    )
  );

-- Add DELETE policy for admin_messages so users can delete their own sent messages
CREATE POLICY "Users can delete own messages"
  ON public.admin_messages
  FOR DELETE
  USING (sender_user_id = auth.uid() OR can_manage_staff(school_id));