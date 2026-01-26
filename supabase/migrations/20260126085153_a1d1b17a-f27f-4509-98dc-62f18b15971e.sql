-- Create table for teacher period logs/notes
CREATE TABLE public.timetable_period_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  timetable_entry_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  topic_covered TEXT NOT NULL,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_timetable_period_logs_entry ON public.timetable_period_logs(timetable_entry_id);
CREATE INDEX idx_timetable_period_logs_teacher ON public.timetable_period_logs(teacher_user_id, school_id);
CREATE INDEX idx_timetable_period_logs_logged_at ON public.timetable_period_logs(logged_at DESC);

-- Enable RLS
ALTER TABLE public.timetable_period_logs ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own logs
CREATE POLICY "Teachers can view their own period logs"
ON public.timetable_period_logs
FOR SELECT
USING (teacher_user_id = auth.uid());

-- Staff managers can view all logs in their school
CREATE POLICY "Staff managers can view all period logs"
ON public.timetable_period_logs
FOR SELECT
USING (public.can_manage_staff(school_id));

-- Teachers can create their own logs
CREATE POLICY "Teachers can create period logs"
ON public.timetable_period_logs
FOR INSERT
WITH CHECK (teacher_user_id = auth.uid());

-- Teachers can update their own logs
CREATE POLICY "Teachers can update their own period logs"
ON public.timetable_period_logs
FOR UPDATE
USING (teacher_user_id = auth.uid());

-- Teachers can delete their own logs
CREATE POLICY "Teachers can delete their own period logs"
ON public.timetable_period_logs
FOR DELETE
USING (teacher_user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_timetable_period_logs_updated_at
BEFORE UPDATE ON public.timetable_period_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();