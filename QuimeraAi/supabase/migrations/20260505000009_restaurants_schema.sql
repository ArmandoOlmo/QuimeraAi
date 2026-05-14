-- Restaurants Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Restaurants (Settings)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    logo_url TEXT,
    hero_image_url TEXT,
    address TEXT,
    phone TEXT,
    cuisine_type TEXT,
    hours TEXT,
    reservation_enabled BOOLEAN DEFAULT false,
    max_party_size INTEGER DEFAULT 10,
    reservation_interval INTEGER DEFAULT 30,
    average_table_duration INTEGER DEFAULT 90,
    languages_enabled TEXT[] DEFAULT '{"en", "es"}',
    currency TEXT DEFAULT 'USD',
    service_fee NUMERIC,
    tax_rate NUMERIC,
    qr_menu_enabled BOOLEAN DEFAULT false,
    public_slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS restaurants_tenant_id_idx ON public.restaurants(tenant_id);
CREATE INDEX IF NOT EXISTS restaurants_public_slug_idx ON public.restaurants(public_slug);

-- 2. Restaurant Menu Items
CREATE TABLE IF NOT EXISTS public.restaurant_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    image_url TEXT,
    dietary_tags TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    ingredients TEXT[] DEFAULT '{}',
    preparation_time INTEGER,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    upsell_items UUID[] DEFAULT '{}',
    ai_generated BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_items_restaurant_id_idx ON public.restaurant_menu_items(restaurant_id);

-- 3. Restaurant Reservations
CREATE TABLE IF NOT EXISTS public.restaurant_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    table_preference TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservations_restaurant_id_idx ON public.restaurant_reservations(restaurant_id);

-- 4. Restaurant Marketing Outputs
CREATE TABLE IF NOT EXISTS public.restaurant_marketing_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    output TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Restaurant Review Templates
CREATE TABLE IF NOT EXISTS public.restaurant_review_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Restaurant Analytics Events
CREATE TABLE IF NOT EXISTS public.restaurant_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_marketing_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_analytics_events ENABLE ROW LEVEL SECURITY;

-- Shared Policy Logic: Owners and Tenant Members can manage, Public can view

-- Restaurants RLS
CREATE POLICY "Public can view restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Tenant members can manage restaurants" ON public.restaurants FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR owner_id = auth.uid()
);

-- Menu Items RLS
CREATE POLICY "Public can view menu items" ON public.restaurant_menu_items FOR SELECT USING (true);
CREATE POLICY "Tenant members can manage menu items" ON public.restaurant_menu_items FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Reservations RLS
-- (Assuming public users can insert if they book from website, so insert is public, select is tenant)
CREATE POLICY "Public can create reservations" ON public.restaurant_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant members can manage reservations" ON public.restaurant_reservations FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Marketing Outputs RLS
CREATE POLICY "Tenant members can manage marketing" ON public.restaurant_marketing_outputs FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Review Templates RLS
CREATE POLICY "Tenant members can manage review templates" ON public.restaurant_review_templates FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Analytics Events RLS
CREATE POLICY "Public can insert analytics" ON public.restaurant_analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant members can view analytics" ON public.restaurant_analytics_events FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.restaurant_menu_items FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.restaurant_reservations FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_review_templates_updated_at BEFORE UPDATE ON public.restaurant_review_templates FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
