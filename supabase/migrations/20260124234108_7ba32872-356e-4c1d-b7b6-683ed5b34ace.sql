-- Fix infinite recursion in admin_messages RLS policy
-- The issue is that the policy references admin_message_recipients which may cause recursion
-- Use a security definer function instead

DROP POLICY IF EXISTS "Users can view their messages" ON public.admin_messages;

CREATE POLICY "Users can view their messages"
ON public.admin_messages
FOR SELECT
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR can_manage_staff(school_id)
  OR can_access_admin_message(id)
);