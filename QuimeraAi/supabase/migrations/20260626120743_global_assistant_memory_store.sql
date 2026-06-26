-- Global Assistant memory/task/action persistence.
-- GA2: additive Supabase store with RLS for the AI Operating Layer.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.global_assistant_is_platform_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('owner', 'superadmin')
    );
$$;

CREATE OR REPLACE FUNCTION public.global_assistant_is_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT target_tenant_id IS NOT NULL
    AND (SELECT auth.uid()) IS NOT NULL
    AND (
      public.global_assistant_is_platform_owner()
      OR EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE t.id = target_tenant_id
          AND t.owner_user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.tenant_members tm
        WHERE tm.tenant_id = target_tenant_id
          AND tm.user_id = (SELECT auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.global_assistant_is_project_member(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT target_project_id IS NOT NULL
    AND (SELECT auth.uid()) IS NOT NULL
    AND (
      public.global_assistant_is_platform_owner()
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = target_project_id
          AND (
            p.user_id = (SELECT auth.uid())
            OR public.global_assistant_is_tenant_member(p.tenant_id)
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.global_assistant_can_access_scope(
  target_scope TEXT,
  target_tenant_id UUID,
  target_user_id UUID,
  target_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT CASE
    WHEN target_scope IN ('admin', 'system') THEN public.global_assistant_is_platform_owner()
    WHEN target_scope = 'user' THEN (
      public.global_assistant_is_platform_owner()
      OR (
        (SELECT auth.uid()) IS NOT NULL
        AND target_user_id = (SELECT auth.uid())
      )
    )
    WHEN target_scope = 'tenant' THEN public.global_assistant_is_tenant_member(target_tenant_id)
    WHEN target_scope IN ('project', 'module') THEN public.global_assistant_is_project_member(target_project_id)
    WHEN target_scope IN ('session', 'task') THEN (
      public.global_assistant_is_platform_owner()
      OR public.global_assistant_is_project_member(target_project_id)
      OR public.global_assistant_is_tenant_member(target_tenant_id)
      OR (
        (SELECT auth.uid()) IS NOT NULL
        AND target_user_id = (SELECT auth.uid())
      )
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.global_assistant_can_access_record(
  target_tenant_id UUID,
  target_user_id UUID,
  target_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT public.global_assistant_is_platform_owner()
    OR public.global_assistant_is_project_member(target_project_id)
    OR public.global_assistant_is_tenant_member(target_tenant_id)
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND target_user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.set_global_assistant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.assistant_memories (
  id TEXT PRIMARY KEY DEFAULT ('asst_mem_' || gen_random_uuid()::text),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  module TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_id TEXT,
  importance NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_memories_scope_check CHECK (
    scope IN ('user', 'tenant', 'project', 'module', 'session', 'task', 'admin', 'system')
  ),
  CONSTRAINT assistant_memories_importance_check CHECK (importance >= 0 AND importance <= 1),
  CONSTRAINT assistant_memories_data_object_check CHECK (jsonb_typeof(data) = 'object'),
  CONSTRAINT assistant_memories_scope_requirements_check CHECK (
    (scope <> 'user' OR user_id IS NOT NULL)
    AND (scope NOT IN ('tenant', 'admin') OR tenant_id IS NOT NULL)
    AND (scope NOT IN ('project', 'module') OR project_id IS NOT NULL)
    AND (scope <> 'module' OR module IS NOT NULL)
    AND (scope <> 'session' OR expires_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.assistant_memory_items (
  id TEXT PRIMARY KEY DEFAULT ('asst_mem_item_' || gen_random_uuid()::text),
  memory_id TEXT NOT NULL REFERENCES public.assistant_memories(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  module TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_id TEXT,
  importance NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_memory_items_scope_check CHECK (
    scope IN ('user', 'tenant', 'project', 'module', 'session', 'task', 'admin', 'system')
  ),
  CONSTRAINT assistant_memory_items_importance_check CHECK (importance >= 0 AND importance <= 1),
  CONSTRAINT assistant_memory_items_data_object_check CHECK (jsonb_typeof(data) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id TEXT PRIMARY KEY DEFAULT ('asst_conversation_' || gen_random_uuid()::text),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'user',
  title TEXT,
  active_task_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_conversations_mode_check CHECK (mode IN ('user', 'owner', 'super_admin', 'support', 'system')),
  CONSTRAINT assistant_conversations_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_context_snapshots (
  id TEXT PRIMARY KEY DEFAULT ('asst_ctx_' || gen_random_uuid()::text),
  conversation_id TEXT REFERENCES public.assistant_conversations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  active_route TEXT,
  active_module TEXT,
  active_entity_type TEXT,
  active_entity_id TEXT,
  current_surface TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_context_snapshots_snapshot_object_check CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id TEXT PRIMARY KEY DEFAULT ('asst_msg_' || gen_random_uuid()::text),
  conversation_id TEXT NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  context_snapshot_id TEXT REFERENCES public.assistant_context_snapshots(id) ON DELETE SET NULL,
  memory_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  action_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_messages_role_check CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  CONSTRAINT assistant_messages_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_tasks (
  id TEXT PRIMARY KEY DEFAULT ('asst_task_' || gen_random_uuid()::text),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  request TEXT NOT NULL,
  plan JSONB,
  draft_changes JSONB,
  result JSONB,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_tasks_status_check CHECK (
    status IN ('draft', 'planning', 'running', 'waiting_for_confirmation', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT assistant_tasks_errors_array_check CHECK (jsonb_typeof(errors) = 'array'),
  CONSTRAINT assistant_tasks_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

ALTER TABLE public.assistant_conversations
  DROP CONSTRAINT IF EXISTS assistant_conversations_active_task_fk;

ALTER TABLE public.assistant_conversations
  ADD CONSTRAINT assistant_conversations_active_task_fk
  FOREIGN KEY (active_task_id) REFERENCES public.assistant_tasks(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.assistant_actions (
  id TEXT PRIMARY KEY DEFAULT ('asst_action_' || gen_random_uuid()::text),
  task_id TEXT REFERENCES public.assistant_tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'user',
  module TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target JSONB NOT NULL DEFAULT '{}'::jsonb,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  before_snapshot JSONB,
  after_snapshot JSONB,
  diff JSONB,
  requires_confirmation BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT,
  tool_used TEXT,
  latency_ms INTEGER,
  cost_usd NUMERIC(12, 6),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_actions_mode_check CHECK (mode IN ('user', 'owner', 'super_admin', 'support', 'system')),
  CONSTRAINT assistant_actions_status_check CHECK (status IN ('planned', 'previewed', 'applied', 'failed', 'rolled_back')),
  CONSTRAINT assistant_actions_json_object_check CHECK (
    jsonb_typeof(target) = 'object'
    AND jsonb_typeof(input) = 'object'
    AND jsonb_typeof(metadata) = 'object'
  ),
  CONSTRAINT assistant_actions_latency_check CHECK (latency_ms IS NULL OR latency_ms >= 0),
  CONSTRAINT assistant_actions_cost_check CHECK (cost_usd IS NULL OR cost_usd >= 0)
);

CREATE TABLE IF NOT EXISTS public.assistant_runtime_events (
  id TEXT PRIMARY KEY DEFAULT ('asst_evt_' || gen_random_uuid()::text),
  type TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES public.assistant_tasks(id) ON DELETE SET NULL,
  action_id TEXT REFERENCES public.assistant_actions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_runtime_events_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_project_summaries (
  id TEXT PRIMARY KEY DEFAULT ('asst_project_summary_' || gen_random_uuid()::text),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_project_summaries_project_uidx UNIQUE (project_id),
  CONSTRAINT assistant_project_summaries_json_object_check CHECK (
    jsonb_typeof(summary) = 'object'
    AND jsonb_typeof(readiness) = 'object'
  )
);

CREATE TABLE IF NOT EXISTS public.assistant_module_summaries (
  id TEXT PRIMARY KEY DEFAULT ('asst_module_summary_' || gen_random_uuid()::text),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_module_summaries_project_module_uidx UNIQUE (project_id, module),
  CONSTRAINT assistant_module_summaries_json_object_check CHECK (
    jsonb_typeof(summary) = 'object'
    AND jsonb_typeof(readiness) = 'object'
  )
);

CREATE TABLE IF NOT EXISTS public.assistant_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned_memory_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_user_preferences_object_check CHECK (jsonb_typeof(preferences) = 'object')
);

CREATE TABLE IF NOT EXISTS public.assistant_admin_events (
  id TEXT PRIMARY KEY DEFAULT ('asst_admin_evt_' || gen_random_uuid()::text),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assistant_admin_events_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS assistant_memories_scope_user_idx ON public.assistant_memories(scope, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_memories_tenant_scope_idx ON public.assistant_memories(tenant_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_memories_project_scope_idx ON public.assistant_memories(project_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_memories_module_idx ON public.assistant_memories(project_id, module, updated_at DESC) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS assistant_memories_expires_idx ON public.assistant_memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS assistant_memories_source_idx ON public.assistant_memories(source, source_entity_type, source_entity_id);

CREATE INDEX IF NOT EXISTS assistant_memory_items_memory_idx ON public.assistant_memory_items(memory_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_memory_items_project_idx ON public.assistant_memory_items(project_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_conversations_user_idx ON public.assistant_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_conversations_project_idx ON public.assistant_conversations(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_context_snapshots_conversation_idx ON public.assistant_context_snapshots(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_messages_conversation_idx ON public.assistant_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS assistant_tasks_user_idx ON public.assistant_tasks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_tasks_project_idx ON public.assistant_tasks(project_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS assistant_actions_task_idx ON public.assistant_actions(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_actions_project_idx ON public.assistant_actions(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_actions_type_idx ON public.assistant_actions(module, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_runtime_events_user_idx ON public.assistant_runtime_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_runtime_events_project_idx ON public.assistant_runtime_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_runtime_events_task_idx ON public.assistant_runtime_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_runtime_events_type_idx ON public.assistant_runtime_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_admin_events_tenant_idx ON public.assistant_admin_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_admin_events_type_idx ON public.assistant_admin_events(event_type, created_at DESC);

DROP TRIGGER IF EXISTS set_assistant_memories_updated_at ON public.assistant_memories;
CREATE TRIGGER set_assistant_memories_updated_at
  BEFORE UPDATE ON public.assistant_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_memory_items_updated_at ON public.assistant_memory_items;
CREATE TRIGGER set_assistant_memory_items_updated_at
  BEFORE UPDATE ON public.assistant_memory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_conversations_updated_at ON public.assistant_conversations;
CREATE TRIGGER set_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_tasks_updated_at ON public.assistant_tasks;
CREATE TRIGGER set_assistant_tasks_updated_at
  BEFORE UPDATE ON public.assistant_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_actions_updated_at ON public.assistant_actions;
CREATE TRIGGER set_assistant_actions_updated_at
  BEFORE UPDATE ON public.assistant_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_project_summaries_updated_at ON public.assistant_project_summaries;
CREATE TRIGGER set_assistant_project_summaries_updated_at
  BEFORE UPDATE ON public.assistant_project_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_module_summaries_updated_at ON public.assistant_module_summaries;
CREATE TRIGGER set_assistant_module_summaries_updated_at
  BEFORE UPDATE ON public.assistant_module_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

DROP TRIGGER IF EXISTS set_assistant_user_preferences_updated_at ON public.assistant_user_preferences;
CREATE TRIGGER set_assistant_user_preferences_updated_at
  BEFORE UPDATE ON public.assistant_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_global_assistant_updated_at();

ALTER TABLE public.assistant_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_runtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_project_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_module_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assistant memories readable by scoped users" ON public.assistant_memories;
CREATE POLICY "Assistant memories readable by scoped users"
ON public.assistant_memories
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant memories insertable by scoped users" ON public.assistant_memories;
CREATE POLICY "Assistant memories insertable by scoped users"
ON public.assistant_memories
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant memories updatable by scoped users" ON public.assistant_memories;
CREATE POLICY "Assistant memories updatable by scoped users"
ON public.assistant_memories
FOR UPDATE
TO authenticated
USING (public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id))
WITH CHECK (public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant memories deletable by scoped users" ON public.assistant_memories;
CREATE POLICY "Assistant memories deletable by scoped users"
ON public.assistant_memories
FOR DELETE
TO authenticated
USING (public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant memory items readable by parent memory access" ON public.assistant_memory_items;
CREATE POLICY "Assistant memory items readable by parent memory access"
ON public.assistant_memory_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assistant_memories m
    WHERE m.id = memory_id
      AND public.global_assistant_can_access_scope(m.scope, m.tenant_id, m.user_id, m.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant memory items insertable by parent memory access" ON public.assistant_memory_items;
CREATE POLICY "Assistant memory items insertable by parent memory access"
ON public.assistant_memory_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assistant_memories m
    WHERE m.id = memory_id
      AND public.global_assistant_can_access_scope(m.scope, m.tenant_id, m.user_id, m.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant memory items updatable by parent memory access" ON public.assistant_memory_items;
CREATE POLICY "Assistant memory items updatable by parent memory access"
ON public.assistant_memory_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assistant_memories m
    WHERE m.id = memory_id
      AND public.global_assistant_can_access_scope(m.scope, m.tenant_id, m.user_id, m.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assistant_memories m
    WHERE m.id = memory_id
      AND public.global_assistant_can_access_scope(m.scope, m.tenant_id, m.user_id, m.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant memory items deletable by parent memory access" ON public.assistant_memory_items;
CREATE POLICY "Assistant memory items deletable by parent memory access"
ON public.assistant_memory_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assistant_memories m
    WHERE m.id = memory_id
      AND public.global_assistant_can_access_scope(m.scope, m.tenant_id, m.user_id, m.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant conversations readable by scoped users" ON public.assistant_conversations;
CREATE POLICY "Assistant conversations readable by scoped users"
ON public.assistant_conversations
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant conversations insertable by scoped users" ON public.assistant_conversations;
CREATE POLICY "Assistant conversations insertable by scoped users"
ON public.assistant_conversations
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant conversations updatable by scoped users" ON public.assistant_conversations;
CREATE POLICY "Assistant conversations updatable by scoped users"
ON public.assistant_conversations
FOR UPDATE
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id))
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant conversations deletable by scoped users" ON public.assistant_conversations;
CREATE POLICY "Assistant conversations deletable by scoped users"
ON public.assistant_conversations
FOR DELETE
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant messages readable by conversation access" ON public.assistant_messages;
CREATE POLICY "Assistant messages readable by conversation access"
ON public.assistant_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assistant_conversations c
    WHERE c.id = conversation_id
      AND public.global_assistant_can_access_record(c.tenant_id, c.user_id, c.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant messages insertable by conversation access" ON public.assistant_messages;
CREATE POLICY "Assistant messages insertable by conversation access"
ON public.assistant_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assistant_conversations c
    WHERE c.id = conversation_id
      AND public.global_assistant_can_access_record(c.tenant_id, c.user_id, c.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant messages deletable by conversation access" ON public.assistant_messages;
CREATE POLICY "Assistant messages deletable by conversation access"
ON public.assistant_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assistant_conversations c
    WHERE c.id = conversation_id
      AND public.global_assistant_can_access_record(c.tenant_id, c.user_id, c.project_id)
  )
);

DROP POLICY IF EXISTS "Assistant context snapshots readable by scoped users" ON public.assistant_context_snapshots;
CREATE POLICY "Assistant context snapshots readable by scoped users"
ON public.assistant_context_snapshots
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant context snapshots insertable by scoped users" ON public.assistant_context_snapshots;
CREATE POLICY "Assistant context snapshots insertable by scoped users"
ON public.assistant_context_snapshots
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant tasks readable by scoped users" ON public.assistant_tasks;
CREATE POLICY "Assistant tasks readable by scoped users"
ON public.assistant_tasks
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant tasks insertable by scoped users" ON public.assistant_tasks;
CREATE POLICY "Assistant tasks insertable by scoped users"
ON public.assistant_tasks
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant tasks updatable by scoped users" ON public.assistant_tasks;
CREATE POLICY "Assistant tasks updatable by scoped users"
ON public.assistant_tasks
FOR UPDATE
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id))
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant actions readable by scoped users" ON public.assistant_actions;
CREATE POLICY "Assistant actions readable by scoped users"
ON public.assistant_actions
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant actions insertable by scoped users" ON public.assistant_actions;
CREATE POLICY "Assistant actions insertable by scoped users"
ON public.assistant_actions
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant actions updatable by scoped users" ON public.assistant_actions;
CREATE POLICY "Assistant actions updatable by scoped users"
ON public.assistant_actions
FOR UPDATE
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id))
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant runtime events readable by scoped users" ON public.assistant_runtime_events;
CREATE POLICY "Assistant runtime events readable by scoped users"
ON public.assistant_runtime_events
FOR SELECT
TO authenticated
USING (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant runtime events insertable by scoped users" ON public.assistant_runtime_events;
CREATE POLICY "Assistant runtime events insertable by scoped users"
ON public.assistant_runtime_events
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_can_access_record(tenant_id, user_id, project_id));

DROP POLICY IF EXISTS "Assistant project summaries readable by project users" ON public.assistant_project_summaries;
CREATE POLICY "Assistant project summaries readable by project users"
ON public.assistant_project_summaries
FOR SELECT
TO authenticated
USING (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant project summaries writable by project users" ON public.assistant_project_summaries;
CREATE POLICY "Assistant project summaries writable by project users"
ON public.assistant_project_summaries
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant project summaries updatable by project users" ON public.assistant_project_summaries;
CREATE POLICY "Assistant project summaries updatable by project users"
ON public.assistant_project_summaries
FOR UPDATE
TO authenticated
USING (public.global_assistant_is_project_member(project_id))
WITH CHECK (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant module summaries readable by project users" ON public.assistant_module_summaries;
CREATE POLICY "Assistant module summaries readable by project users"
ON public.assistant_module_summaries
FOR SELECT
TO authenticated
USING (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant module summaries writable by project users" ON public.assistant_module_summaries;
CREATE POLICY "Assistant module summaries writable by project users"
ON public.assistant_module_summaries
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant module summaries updatable by project users" ON public.assistant_module_summaries;
CREATE POLICY "Assistant module summaries updatable by project users"
ON public.assistant_module_summaries
FOR UPDATE
TO authenticated
USING (public.global_assistant_is_project_member(project_id))
WITH CHECK (public.global_assistant_is_project_member(project_id));

DROP POLICY IF EXISTS "Assistant user preferences readable by owner" ON public.assistant_user_preferences;
CREATE POLICY "Assistant user preferences readable by owner"
ON public.assistant_user_preferences
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Assistant user preferences insertable by owner" ON public.assistant_user_preferences;
CREATE POLICY "Assistant user preferences insertable by owner"
ON public.assistant_user_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) OR public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Assistant user preferences updatable by owner" ON public.assistant_user_preferences;
CREATE POLICY "Assistant user preferences updatable by owner"
ON public.assistant_user_preferences
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.global_assistant_is_platform_owner())
WITH CHECK (user_id = (SELECT auth.uid()) OR public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Assistant user preferences deletable by owner" ON public.assistant_user_preferences;
CREATE POLICY "Assistant user preferences deletable by owner"
ON public.assistant_user_preferences
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Assistant admin events readable by platform owners" ON public.assistant_admin_events;
CREATE POLICY "Assistant admin events readable by platform owners"
ON public.assistant_admin_events
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Assistant admin events insertable by platform owners" ON public.assistant_admin_events;
CREATE POLICY "Assistant admin events insertable by platform owners"
ON public.assistant_admin_events
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_is_platform_owner());

REVOKE ALL ON FUNCTION public.global_assistant_is_platform_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.global_assistant_is_tenant_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.global_assistant_is_project_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.global_assistant_can_access_scope(TEXT, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.global_assistant_can_access_record(UUID, UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.global_assistant_is_platform_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.global_assistant_is_tenant_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.global_assistant_is_project_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.global_assistant_can_access_scope(TEXT, UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.global_assistant_can_access_record(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON TABLE public.assistant_memories FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_memory_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_tasks FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_actions FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_runtime_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_context_snapshots FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_project_summaries FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_module_summaries FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_user_preferences FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_admin_events FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_memories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_memory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.assistant_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assistant_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assistant_actions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.assistant_runtime_events TO authenticated;
GRANT SELECT, INSERT ON TABLE public.assistant_context_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assistant_project_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assistant_module_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_user_preferences TO authenticated;
GRANT SELECT, INSERT ON TABLE public.assistant_admin_events TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_memories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_memory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_actions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_runtime_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_context_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_project_summaries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_module_summaries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_user_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_admin_events TO service_role;

NOTIFY pgrst, 'reload schema';
