-- Add UPDATE policy for cleared_conversations to allow upserts
CREATE POLICY "Users can update own cleared conversations"
ON public.cleared_conversations
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());