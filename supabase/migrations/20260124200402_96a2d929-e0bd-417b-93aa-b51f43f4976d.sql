-- Create table for teacher period logs (completion status and notes)
CREATE TABLE public.teacher_period_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'cancelled')),
  notes TEXT,
  topics_covered TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(timetable_entry_id, log_date)
);

-- Enable RLS
ALTER TABLE public.teacher_period_logs ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own logs
CREATE POLICY "Teachers can view their own period logs"
ON public.teacher_period_logs
FOR SELECT
USING (auth.uid() = teacher_user_id);

-- Teachers can create their own logs
CREATE POLICY "Teachers can create their own period logs"
ON public.teacher_period_logs
FOR INSERT
WITH CHECK (auth.uid() = teacher_user_id);

-- Teachers can update their own logs
CREATE POLICY "Teachers can update their own period logs"
ON public.teacher_period_logs
FOR UPDATE
USING (auth.uid() = teacher_user_id);

-- Teachers can delete their own logs
CREATE POLICY "Teachers can delete their own period logs"
ON public.teacher_period_logs
FOR DELETE
USING (auth.uid() = teacher_user_id);

-- Create index for faster lookups
CREATE INDEX idx_teacher_period_logs_teacher_date ON public.teacher_period_logs(teacher_user_id, log_date);
CREATE INDEX idx_teacher_period_logs_entry_date ON public.teacher_period_logs(timetable_entry_id, log_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_period_logs;