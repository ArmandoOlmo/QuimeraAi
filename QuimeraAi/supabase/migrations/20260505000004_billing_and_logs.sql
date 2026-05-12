CREATE TABLE IF NOT EXISTS public.api_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    model text,
    feature text,
    success boolean DEFAULT true,
    error text,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    latency_ms integer,
    endpoint text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_credits_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    operation text NOT NULL,
    credits_used numeric DEFAULT 0,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: apiUsage looks like an aggregated table in Firebase, we can use api_logs or create a similar table
CREATE TABLE IF NOT EXISTS public.api_usage_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    model text NOT NULL,
    count integer DEFAULT 0,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policies
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api logs" ON public.api_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own ai credit transactions" ON public.ai_credits_transactions FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert usage stats / logs (usually), or users can insert logs 
CREATE POLICY "Users can insert their own api logs" ON public.api_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
