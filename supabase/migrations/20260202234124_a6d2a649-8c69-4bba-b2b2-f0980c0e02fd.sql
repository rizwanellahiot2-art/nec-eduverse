-- AI Student Digital Twin System - Student Profile Intelligence

-- Student AI profiles with learning patterns and risk scores
CREATE TABLE public.ai_student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Learning style
  learning_style TEXT DEFAULT 'unknown' CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading_writing', 'unknown')),
  learning_style_confidence NUMERIC DEFAULT 0,
  -- Academic strengths/weaknesses
  strong_subjects TEXT[] DEFAULT '{}',
  weak_subjects TEXT[] DEFAULT '{}',
  -- Attention patterns
  attention_span_minutes INTEGER DEFAULT 45,
  best_learning_time TEXT DEFAULT 'morning' CHECK (best_learning_time IN ('morning', 'midday', 'afternoon', 'evening')),
  -- Risk scores (0-100)
  risk_score INTEGER DEFAULT 0,
  burnout_probability INTEGER DEFAULT 0,
  dropout_risk INTEGER DEFAULT 0,
  focus_drop_detected BOOLEAN DEFAULT FALSE,
  -- Learning classification
  learning_speed TEXT DEFAULT 'average' CHECK (learning_speed IN ('slow', 'below_average', 'average', 'above_average', 'accelerated')),
  -- AI suggestions
  needs_extra_support BOOLEAN DEFAULT FALSE,
  needs_remedial_classes BOOLEAN DEFAULT FALSE,
  needs_counseling BOOLEAN DEFAULT FALSE,
  should_be_accelerated BOOLEAN DEFAULT FALSE,
  -- Emotional trend (derived from behavior notes)
  emotional_trend TEXT DEFAULT 'stable' CHECK (emotional_trend IN ('declining', 'stable', 'improving', 'concerning')),
  -- Metadata
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

-- Parent trust dashboard - Daily micro updates
CREATE TABLE public.ai_parent_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'daily' CHECK (update_type IN ('daily', 'weekly', 'monthly')),
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Content
  attendance_status TEXT,
  participation_level TEXT,
  teacher_notes TEXT[],
  behavior_remarks TEXT[],
  -- AI summaries
  ai_summary TEXT,
  focus_trend TEXT,
  performance_change_percent NUMERIC,
  key_insights TEXT[],
  recommendations TEXT[],
  -- Metadata
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- School reputation intelligence
CREATE TABLE public.ai_school_reputation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  -- Scores (0-100)
  reputation_score INTEGER DEFAULT 0,
  parent_satisfaction_index INTEGER DEFAULT 0,
  -- Trend data
  main_strengths TEXT[] DEFAULT '{}',
  risk_factors TEXT[] DEFAULT '{}',
  trust_factors TEXT[] DEFAULT '{}',
  -- AI recommendations
  ai_recommendations TEXT[] DEFAULT '{}',
  -- Raw metrics
  attendance_consistency NUMERIC DEFAULT 0,
  student_success_rate NUMERIC DEFAULT 0,
  engagement_level NUMERIC DEFAULT 0,
  complaint_ratio NUMERIC DEFAULT 0,
  nps_score INTEGER DEFAULT 0,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, report_month)
);

-- Teacher performance analytics
CREATE TABLE public.ai_teacher_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL,
  analysis_month DATE NOT NULL,
  -- Performance scores (0-100)
  overall_score INTEGER DEFAULT 0,
  student_improvement_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  attendance_impact_score INTEGER DEFAULT 0,
  feedback_sentiment_score INTEGER DEFAULT 0,
  -- Subject difficulty
  subject_difficulty_rating TEXT DEFAULT 'moderate',
  -- Status
  performance_tier TEXT DEFAULT 'average' CHECK (performance_tier IN ('top', 'above_average', 'average', 'needs_improvement', 'critical')),
  needs_training BOOLEAN DEFAULT FALSE,
  -- Insights
  ai_insights TEXT[],
  improvement_areas TEXT[],
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, teacher_user_id, analysis_month)
);

-- Early warning system alerts
CREATE TABLE public.ai_early_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('dropout_risk', 'academic_decline', 'emotional_stress', 'attendance_pattern', 'engagement_drop')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  -- Details
  title TEXT NOT NULL,
  description TEXT,
  detected_patterns TEXT[],
  recommended_actions TEXT[],
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  -- Notifications
  notified_admin BOOLEAN DEFAULT FALSE,
  notified_teacher BOOLEAN DEFAULT FALSE,
  notified_parent BOOLEAN DEFAULT FALSE,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic predictions
CREATE TABLE public.ai_academic_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT,
  -- Predictions
  predicted_final_grade NUMERIC,
  grade_confidence INTEGER DEFAULT 0,
  promotion_probability INTEGER DEFAULT 0,
  failure_risk INTEGER DEFAULT 0,
  -- Subject breakdown
  subject_predictions JSONB DEFAULT '[]',
  -- Improvement suggestions
  improvement_probability INTEGER DEFAULT 0,
  suggested_focus_areas TEXT[],
  -- Metadata
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Career path suggestions for senior students
CREATE TABLE public.ai_career_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Career fields
  suggested_fields TEXT[] DEFAULT '{}',
  field_match_scores JSONB DEFAULT '{}',
  -- Academic alignment
  recommended_subjects TEXT[] DEFAULT '{}',
  university_readiness_score INTEGER DEFAULT 0,
  -- Interests
  detected_interests TEXT[] DEFAULT '{}',
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI counseling recommendations
CREATE TABLE public.ai_counseling_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reason_type TEXT NOT NULL CHECK (reason_type IN ('emotional_stress', 'academic_pressure', 'behavioral', 'social', 'family', 'career_guidance', 'other')),
  reason_details TEXT,
  detected_indicators TEXT[],
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMPTZ,
  counselor_user_id UUID,
  session_notes TEXT,
  outcome TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI-generated timetable suggestions
CREATE TABLE public.ai_timetable_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_section_id UUID,
  suggestion_data JSONB NOT NULL DEFAULT '{}',
  conflicts_found INTEGER DEFAULT 0,
  optimization_score INTEGER DEFAULT 0,
  version_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_parent_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_school_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_early_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_academic_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_career_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_counseling_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_timetable_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Student profiles - Staff can read for their school
CREATE POLICY "Staff can view AI student profiles" ON public.ai_student_profiles
  FOR SELECT USING (public.is_school_user(school_id));

CREATE POLICY "Staff can manage AI student profiles" ON public.ai_student_profiles
  FOR ALL USING (public.can_manage_students(school_id));

-- Parent updates - Parents can see their own children's updates
CREATE POLICY "Parents can view their child updates" ON public.ai_parent_updates
  FOR SELECT USING (parent_user_id = auth.uid() OR public.can_manage_students(school_id));

CREATE POLICY "Staff can manage parent updates" ON public.ai_parent_updates
  FOR ALL USING (public.can_manage_students(school_id));

-- School reputation - Owners and principals
CREATE POLICY "Staff can view school reputation" ON public.ai_school_reputation
  FOR SELECT USING (public.can_manage_staff(school_id));

CREATE POLICY "Staff can manage school reputation" ON public.ai_school_reputation
  FOR ALL USING (public.can_manage_staff(school_id));

-- Teacher performance - Principals and owners
CREATE POLICY "Admins can view teacher performance" ON public.ai_teacher_performance
  FOR SELECT USING (public.can_manage_staff(school_id) OR teacher_user_id = auth.uid());

CREATE POLICY "Admins can manage teacher performance" ON public.ai_teacher_performance
  FOR ALL USING (public.can_manage_staff(school_id));

-- Early warnings - Staff can view
CREATE POLICY "Staff can view early warnings" ON public.ai_early_warnings
  FOR SELECT USING (public.is_school_user(school_id));

CREATE POLICY "Staff can manage early warnings" ON public.ai_early_warnings
  FOR ALL USING (public.can_manage_students(school_id));

-- Academic predictions - Staff and parents of student
CREATE POLICY "Staff can view predictions" ON public.ai_academic_predictions
  FOR SELECT USING (public.is_school_user(school_id) OR public.is_my_child(school_id, student_id));

CREATE POLICY "Staff can manage predictions" ON public.ai_academic_predictions
  FOR ALL USING (public.can_manage_students(school_id));

-- Career suggestions - Staff and parents
CREATE POLICY "Staff can view career suggestions" ON public.ai_career_suggestions
  FOR SELECT USING (public.is_school_user(school_id) OR public.is_my_child(school_id, student_id));

CREATE POLICY "Staff can manage career suggestions" ON public.ai_career_suggestions
  FOR ALL USING (public.can_manage_students(school_id));

-- Counseling queue - Counselors and admins
CREATE POLICY "Counselors can view counseling queue" ON public.ai_counseling_queue
  FOR SELECT USING (public.can_manage_students(school_id) OR public.has_role(school_id, 'counselor'));

CREATE POLICY "Staff can manage counseling queue" ON public.ai_counseling_queue
  FOR ALL USING (public.can_manage_students(school_id) OR public.has_role(school_id, 'counselor'));

-- Timetable suggestions - Academic staff
CREATE POLICY "Staff can view timetable suggestions" ON public.ai_timetable_suggestions
  FOR SELECT USING (public.is_school_user(school_id));

CREATE POLICY "Staff can manage timetable suggestions" ON public.ai_timetable_suggestions
  FOR ALL USING (public.can_manage_staff(school_id));

-- Triggers for updated_at
CREATE TRIGGER update_ai_student_profiles_updated_at
  BEFORE UPDATE ON public.ai_student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_ai_student_profiles_school ON public.ai_student_profiles(school_id);
CREATE INDEX idx_ai_student_profiles_student ON public.ai_student_profiles(student_id);
CREATE INDEX idx_ai_student_profiles_risk ON public.ai_student_profiles(risk_score DESC);
CREATE INDEX idx_ai_parent_updates_parent ON public.ai_parent_updates(parent_user_id, update_date DESC);
CREATE INDEX idx_ai_early_warnings_active ON public.ai_early_warnings(school_id, status) WHERE status = 'active';
CREATE INDEX idx_ai_teacher_performance_school ON public.ai_teacher_performance(school_id, analysis_month DESC);