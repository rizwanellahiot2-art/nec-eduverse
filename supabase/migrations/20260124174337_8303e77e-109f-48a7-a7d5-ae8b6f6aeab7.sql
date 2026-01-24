-- Create school alert settings table for configurable thresholds
CREATE TABLE public.school_alert_settings (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  attendance_warning_threshold INTEGER NOT NULL DEFAULT 75,
  attendance_critical_threshold INTEGER NOT NULL DEFAULT 60,
  pending_invoices_threshold INTEGER NOT NULL DEFAULT 10,
  support_ticket_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_alert_settings ENABLE ROW LEVEL SECURITY;

-- Policies for school alert settings
CREATE POLICY "Users can view their school alert settings"
ON public.school_alert_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships sm
    WHERE sm.school_id = school_alert_settings.school_id
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
  )
);

CREATE POLICY "Principals can manage school alert settings"
ON public.school_alert_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = school_alert_settings.school_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('principal', 'vice_principal', 'school_owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.school_id = school_alert_settings.school_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('principal', 'vice_principal', 'school_owner')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_school_alert_settings_updated_at
BEFORE UPDATE ON public.school_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();