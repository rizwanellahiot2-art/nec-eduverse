-- Add is_break flag to timetable_periods for break periods (recess, lunch)
ALTER TABLE public.timetable_periods
ADD COLUMN is_break boolean NOT NULL DEFAULT false;

-- Add index for quick break period lookups
CREATE INDEX idx_timetable_periods_is_break ON public.timetable_periods(school_id, is_break) WHERE is_break = true;

-- Enable realtime for timetable_entries so multiple users see changes live
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_entries;