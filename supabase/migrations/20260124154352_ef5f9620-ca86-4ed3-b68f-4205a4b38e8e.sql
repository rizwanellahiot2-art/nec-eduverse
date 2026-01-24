-- Create assignment_submissions table for student work submissions
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'late', 'graded', 'returned')),
  -- Grading fields
  marks_obtained NUMERIC,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view submissions for their assigned sections
CREATE POLICY "Teachers can view submissions for their sections"
ON public.assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.assignments a ON a.class_section_id = ta.class_section_id AND a.school_id = ta.school_id
    WHERE ta.school_id = assignment_submissions.school_id
    AND a.id = assignment_submissions.assignment_id
    AND ta.teacher_user_id = auth.uid()
  )
);

-- Policy: Teachers can update/grade submissions for their sections
CREATE POLICY "Teachers can grade submissions"
ON public.assignment_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.assignments a ON a.class_section_id = ta.class_section_id AND a.school_id = ta.school_id
    WHERE ta.school_id = assignment_submissions.school_id
    AND a.id = assignment_submissions.assignment_id
    AND ta.teacher_user_id = auth.uid()
  )
);

-- Policy: Students can view their own submissions (via profile link)
CREATE POLICY "Students can view own submissions"
ON public.assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = assignment_submissions.student_id
    AND p.user_id = auth.uid()
  )
);

-- Policy: Students can insert their own submissions
CREATE POLICY "Students can submit assignments"
ON public.assignment_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = student_id
    AND p.user_id = auth.uid()
  )
);

-- Policy: Students can update their own draft/submitted work (before grading)
CREATE POLICY "Students can update own submissions"
ON public.assignment_submissions
FOR UPDATE
USING (
  status IN ('draft', 'submitted')
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = assignment_submissions.student_id
    AND p.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_status ON public.assignment_submissions(status);

-- Add trigger for updated_at
CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();