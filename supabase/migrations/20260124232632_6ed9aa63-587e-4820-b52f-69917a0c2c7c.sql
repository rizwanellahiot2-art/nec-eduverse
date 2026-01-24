-- Allow all school members to view the user directory for messaging purposes
-- This is needed so teachers, students, etc. can see who they can message

DROP POLICY IF EXISTS "School members can view directory for messaging" ON public.school_user_directory;

CREATE POLICY "School members can view directory for messaging"
ON public.school_user_directory
FOR SELECT
USING (public.is_school_member(school_id));
