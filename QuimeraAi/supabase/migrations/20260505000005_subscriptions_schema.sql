-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id text NOT NULL,
    billing_cycle text NOT NULL DEFAULT 'monthly',
    status text NOT NULL DEFAULT 'active',
    start_date timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_start timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end timestamptz NOT NULL,
    trial_end_date timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    cancelled_at timestamptz,
    stripe_customer_id text,
    stripe_subscription_id text,
    add_ons jsonb DEFAULT '[]'::jsonb,
    credit_packages_purchased jsonb DEFAULT '[]'::jsonb,
    ai_credits_usage jsonb,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Setup RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Users can view their tenant subscriptions"
    ON public.subscriptions
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant owners can update their subscriptions"
    ON public.subscriptions
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Service role can manage all subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

