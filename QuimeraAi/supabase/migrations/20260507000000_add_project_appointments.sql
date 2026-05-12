-- ============================================================================
-- Create project_appointments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

  -- Core fields
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'medium',

  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  all_day BOOLEAN DEFAULT false,

  -- Organizer
  organizer_id UUID REFERENCES public.users(id),
  organizer_name TEXT,
  organizer_email TEXT,

  -- JSONB arrays
  participants JSONB DEFAULT '[]'::jsonb,
  location JSONB DEFAULT '{"type":"virtual"}'::jsonb,
  recurrence JSONB,
  is_recurring_instance BOOLEAN DEFAULT false,
  reminders JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  follow_up_actions JSONB DEFAULT '[]'::jsonb,

  -- AI features
  ai_insights JSONB,
  ai_prep_enabled BOOLEAN DEFAULT true,
  auto_transcription BOOLEAN DEFAULT false,
  google_sync JSONB,

  -- Linked entities
  linked_lead_ids TEXT[],
  linked_deal_ids TEXT[],
  linked_project_ids TEXT[],
  parent_appointment_id UUID,

  -- Metadata
  tags TEXT[],
  color TEXT,
  custom_color TEXT,

  -- Outcome
  outcome TEXT,
  outcome_notes TEXT,
  rating INTEGER,
  actual_duration INTEGER,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.users(id),
  cancelled_reason TEXT,

  -- Completion
  completed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_appointments_project_id ON public.project_appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_appointments_start_date ON public.project_appointments(start_date);
CREATE INDEX IF NOT EXISTS idx_project_appointments_organizer ON public.project_appointments(organizer_id);

-- RLS
ALTER TABLE public.project_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read project appointments" ON public.project_appointments;
CREATE POLICY "Users can read project appointments" ON public.project_appointments
FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  OR organizer_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can manage project appointments" ON public.project_appointments;
CREATE POLICY "Users can manage project appointments" ON public.project_appointments
FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  OR organizer_id = auth.uid()
);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_appointments;

-- ============================================================================
-- Add missing created_at to custom_domains
-- ============================================================================
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
