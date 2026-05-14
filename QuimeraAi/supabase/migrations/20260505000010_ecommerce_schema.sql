-- E-commerce Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_email TEXT NOT NULL,
    store_phone TEXT,
    store_logo TEXT,
    currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    storefront_theme JSONB DEFAULT '{}',
    tax_enabled BOOLEAN DEFAULT false,
    tax_rate NUMERIC DEFAULT 0,
    tax_name TEXT DEFAULT 'Tax',
    tax_included BOOLEAN DEFAULT false,
    shipping_zones JSONB DEFAULT '[]',
    stripe_enabled BOOLEAN DEFAULT false,
    paypal_enabled BOOLEAN DEFAULT false,
    cash_on_delivery_enabled BOOLEAN DEFAULT false,
    stripe_connect_account_id TEXT,
    order_notification_email TEXT,
    low_stock_notifications BOOLEAN DEFAULT false,
    low_stock_threshold INTEGER DEFAULT 5,
    require_phone BOOLEAN DEFAULT false,
    require_shipping_address BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_settings_project_id_idx ON public.store_settings(project_id);

-- 2. Store Categories
CREATE TABLE IF NOT EXISTS public.store_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS store_categories_project_id_idx ON public.store_categories(project_id);

-- 3. Store Products
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    compare_at_price NUMERIC,
    cost_price NUMERIC,
    currency TEXT DEFAULT 'USD',
    sku TEXT,
    barcode TEXT,
    quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT true,
    low_stock_threshold INTEGER DEFAULT 5,
    images JSONB DEFAULT '[]', -- Array of ProductImage
    tags TEXT[] DEFAULT '{}',
    has_variants BOOLEAN DEFAULT false,
    variants JSONB DEFAULT '[]',
    options JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    is_digital BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    weight NUMERIC,
    weight_unit TEXT DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_products_project_id_idx ON public.store_products(project_id);
CREATE INDEX IF NOT EXISTS store_products_slug_idx ON public.store_products(slug);

-- 4. Store Customers
CREATE TABLE IF NOT EXISTS public.store_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    default_shipping_address JSONB,
    default_billing_address JSONB,
    addresses JSONB DEFAULT '[]',
    accepts_marketing BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_customers_project_id_idx ON public.store_customers(project_id);

-- 5. Store Orders
CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.store_customers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    discount_code TEXT,
    shipping_cost NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
    payment_method TEXT NOT NULL,
    payment_intent_id TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    carrier TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_orders_project_id_idx ON public.store_orders(project_id);

-- 6. Store Order Items
CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
    variant_id TEXT,
    name TEXT NOT NULL,
    sku TEXT,
    image_url TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS store_order_items_order_id_idx ON public.store_order_items(order_id);

-- 7. Store Reviews
CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    comment TEXT NOT NULL,
    verified_purchase BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending',
    helpful_votes INTEGER DEFAULT 0,
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_reviews_project_id_idx ON public.store_reviews(project_id);
CREATE INDEX IF NOT EXISTS store_reviews_product_id_idx ON public.store_reviews(product_id);

-- 8. Store Discounts
CREATE TABLE IF NOT EXISTS public.store_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    applies_to TEXT NOT NULL DEFAULT 'all',
    product_ids UUID[] DEFAULT '{}',
    category_ids UUID[] DEFAULT '{}',
    minimum_purchase NUMERIC,
    minimum_quantity INTEGER,
    max_uses INTEGER,
    max_uses_per_customer INTEGER,
    used_count INTEGER DEFAULT 0,
    customer_eligibility TEXT NOT NULL DEFAULT 'everyone',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_discounts_project_id_idx ON public.store_discounts(project_id);

-- RLS Policies
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_discounts ENABLE ROW LEVEL SECURITY;

-- Shared Access Logic: Public can view active products/categories/reviews/settings, Owners can do everything

CREATE POLICY "Public can view active products" ON public.store_products FOR SELECT USING (status = 'active');
CREATE POLICY "Public can view categories" ON public.store_categories FOR SELECT USING (true);
CREATE POLICY "Public can view store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public can view approved reviews" ON public.store_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Public can insert reviews" ON public.store_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert orders" ON public.store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert order items" ON public.store_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert customers" ON public.store_customers FOR INSERT WITH CHECK (true);

-- Create a helper function for owner access check
CREATE OR REPLACE FUNCTION is_project_owner_or_tenant(p_project_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = p_project_id 
        AND (user_id = auth.uid() OR tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        ))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Owner Policies
CREATE POLICY "Owners can manage store settings" ON public.store_settings FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage categories" ON public.store_categories FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage products" ON public.store_products FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage customers" ON public.store_customers FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage orders" ON public.store_orders FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage order items" ON public.store_order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND is_project_owner_or_tenant(o.project_id))
);
CREATE POLICY "Owners can manage reviews" ON public.store_reviews FOR ALL USING (is_project_owner_or_tenant(project_id));
CREATE POLICY "Owners can manage discounts" ON public.store_discounts FOR ALL USING (is_project_owner_or_tenant(project_id));

-- Triggers for updated_at
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_categories_updated_at BEFORE UPDATE ON public.store_categories FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_customers_updated_at BEFORE UPDATE ON public.store_customers FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_orders_updated_at BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_reviews_updated_at BEFORE UPDATE ON public.store_reviews FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();
CREATE TRIGGER update_store_discounts_updated_at BEFORE UPDATE ON public.store_discounts FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();

-- 10. Store Users (Auth & Memberships)
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'active',
    segments TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    customer_id UUID REFERENCES public.store_customers(id) ON DELETE SET NULL,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    average_order_value NUMERIC DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    accepts_marketing BOOLEAN DEFAULT false,
    preferred_language TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_users_project_id_idx ON public.store_users(project_id);
CREATE INDEX IF NOT EXISTS store_users_email_idx ON public.store_users(email);

-- 11. Store User Segments
CREATE TABLE IF NOT EXISTS public.store_user_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    type TEXT DEFAULT 'manual',
    rules JSONB DEFAULT '[]',
    user_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_user_segments_project_id_idx ON public.store_user_segments(project_id);

-- 12. Store User Activities
CREATE TABLE IF NOT EXISTS public.store_user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.store_users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_user_activities_project_id_idx ON public.store_user_activities(project_id);
CREATE INDEX IF NOT EXISTS store_user_activities_user_id_idx ON public.store_user_activities(user_id);

-- Alter store_settings to include Stripe Connect status fields
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT;

-- 11. Store Carts
CREATE TABLE IF NOT EXISTS public.store_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- The tenant owner's user_id or the customer's user_id, depending on use-case
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_carts_project_id_idx ON public.store_carts(project_id);
CREATE INDEX IF NOT EXISTS store_carts_user_id_idx ON public.store_carts(user_id);

-- 12. Store Stock Notifications
CREATE TABLE IF NOT EXISTS public.store_stock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_slug TEXT,
    product_image TEXT,
    email TEXT NOT NULL,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_stock_notifications_project_id_idx ON public.store_stock_notifications(project_id);
CREATE INDEX IF NOT EXISTS store_stock_notifications_product_id_idx ON public.store_stock_notifications(product_id);
