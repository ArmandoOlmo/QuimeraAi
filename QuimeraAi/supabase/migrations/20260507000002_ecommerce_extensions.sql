-- Ecommerce and Admin Extensions Schema

-- 1. Store Carts
CREATE TABLE IF NOT EXISTS public.store_carts (
    id TEXT PRIMARY KEY, -- usually userId or sessionId
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS store_id UUID;

CREATE INDEX IF NOT EXISTS store_carts_store_id_idx ON public.store_carts(store_id);
CREATE INDEX IF NOT EXISTS store_carts_user_id_idx ON public.store_carts(user_id);

-- 2. Store Wishlists
CREATE TABLE IF NOT EXISTS public.store_wishlists (
    id TEXT PRIMARY KEY, -- usually user_id_product_id or session_id_product_id
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    product_image TEXT,
    product_price NUMERIC NOT NULL,
    product_compare_at_price NUMERIC,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_wishlists_store_id_idx ON public.store_wishlists(store_id);
CREATE INDEX IF NOT EXISTS store_wishlists_user_id_idx ON public.store_wishlists(user_id);

-- 3. Store Stock Notifications
CREATE TABLE IF NOT EXISTS public.store_stock_notifications (
    id TEXT PRIMARY KEY, -- product_id_email
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    product_image TEXT,
    email TEXT NOT NULL,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_stock_notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS store_stock_notifications_store_id_idx ON public.store_stock_notifications(store_id);
CREATE INDEX IF NOT EXISTS store_stock_notifications_email_idx ON public.store_stock_notifications(email);

-- 4. API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_project_id_idx ON public.api_keys(project_id);

-- 5. Blocked Dates (for appointments)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocked_dates_project_id_idx ON public.blocked_dates(project_id);

-- 6. Permission Templates (for tenant roles)
CREATE TABLE IF NOT EXISTS public.permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS permission_templates_tenant_id_idx ON public.permission_templates(tenant_id);

-- RLS Policies
ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- Carts: Users can read/write their own carts. Anonymous access allowed if ID matches session (this is complex, for simplicity allow all to insert/update, read by ID)
DROP POLICY IF EXISTS "Public can manage carts by ID" ON public.store_carts;
CREATE POLICY "Public can manage carts by ID" ON public.store_carts FOR ALL USING (true) WITH CHECK (true);

-- Wishlists: Same
DROP POLICY IF EXISTS "Public can manage wishlists" ON public.store_wishlists;
CREATE POLICY "Public can manage wishlists" ON public.store_wishlists FOR ALL USING (true) WITH CHECK (true);

-- Stock Notifications: Same
DROP POLICY IF EXISTS "Public can manage stock notifications" ON public.store_stock_notifications;
CREATE POLICY "Public can manage stock notifications" ON public.store_stock_notifications FOR ALL USING (true) WITH CHECK (true);

-- API Keys: Only project owners
DROP POLICY IF EXISTS "Owners can manage API keys" ON public.api_keys;
CREATE POLICY "Owners can manage API keys" ON public.api_keys FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())))
);

-- Blocked Dates: Owners
DROP POLICY IF EXISTS "Owners can manage blocked dates" ON public.blocked_dates;
CREATE POLICY "Owners can manage blocked dates" ON public.blocked_dates FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Public can view blocked dates" ON public.blocked_dates;
CREATE POLICY "Public can view blocked dates" ON public.blocked_dates FOR SELECT USING (true);

-- Permission Templates: Tenant owners/admins
DROP POLICY IF EXISTS "Tenant members can manage permission templates" ON public.permission_templates;
CREATE POLICY "Tenant members can manage permission templates" ON public.permission_templates FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

DROP TRIGGER IF EXISTS update_store_carts_updated_at ON public.store_carts;
CREATE TRIGGER update_store_carts_updated_at BEFORE UPDATE ON public.store_carts FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
DROP TRIGGER IF EXISTS update_permission_templates_updated_at ON public.permission_templates;
CREATE TRIGGER update_permission_templates_updated_at BEFORE UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
