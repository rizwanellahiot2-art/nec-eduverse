-- Fix admin_messages SELECT policy to allow recipients to view messages they received
DROP POLICY IF EXISTS "School members can view admin messages" ON public.admin_messages;

CREATE POLICY "Users can view their messages"
ON public.admin_messages
FOR SELECT
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR can_manage_staff(school_id)
  OR EXISTS (
    SELECT 1 FROM public.admin_message_recipients r
    WHERE r.message_id = id
      AND r.recipient_user_id = auth.uid()
  )
);