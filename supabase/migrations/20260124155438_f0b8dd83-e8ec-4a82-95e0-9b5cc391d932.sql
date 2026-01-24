-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Students can upload to their own folder (student_id/assignment_id/filename)
CREATE POLICY "Students can upload own submission files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);

-- Students can view their own files
CREATE POLICY "Students can view own submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);

-- Students can delete their own files
CREATE POLICY "Students can delete own submission files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);

-- Teachers can view submission files for their assigned sections
CREATE POLICY "Teachers can view submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM public.assignment_submissions sub
    JOIN public.assignments a ON a.id = sub.assignment_id
    JOIN public.teacher_assignments ta ON ta.class_section_id = a.class_section_id
    WHERE ta.teacher_user_id = auth.uid()
    AND sub.student_id::text = (storage.foldername(name))[1]
  )
);

-- Staff with student management can view all submission files
CREATE POLICY "Staff can view all submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND public.can_manage_students(s.school_id)
  )
);