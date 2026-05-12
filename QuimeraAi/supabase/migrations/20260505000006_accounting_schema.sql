-- Create Accounting Tables
CREATE TABLE IF NOT EXISTS public.accounting_vendors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_id text,
    website text,
    notes text,
    total_spent numeric DEFAULT 0,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounting_products_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    type text NOT NULL, -- 'product' or 'service'
    price numeric NOT NULL DEFAULT 0,
    tax_rate numeric DEFAULT 0,
    sku text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounting_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    invoice_number text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    issue_date date NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    customer_name text NOT NULL,
    customer_email text,
    customer_address text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    subtotal numeric NOT NULL DEFAULT 0,
    tax_total numeric NOT NULL DEFAULT 0,
    discount_total numeric DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounting_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'income' or 'expense'
    category text NOT NULL,
    amount numeric NOT NULL,
    date date NOT NULL,
    description text,
    vendor_id uuid REFERENCES public.accounting_vendors(id) ON DELETE SET NULL,
    invoice_id uuid REFERENCES public.accounting_invoices(id) ON DELETE SET NULL,
    reference_number text,
    payment_method text,
    status text DEFAULT 'completed',
    receipt_url text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.accounting_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- For simplicity, since project members can view/manage project data, we use project_id

CREATE POLICY "Users can manage vendors for their projects"
    ON public.accounting_vendors FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            LEFT JOIN tenant_members tm ON p.tenant_id = tm.tenant_id
            WHERE p.user_id = auth.uid() OR tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage products for their projects"
    ON public.accounting_products_services FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            LEFT JOIN tenant_members tm ON p.tenant_id = tm.tenant_id
            WHERE p.user_id = auth.uid() OR tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage invoices for their projects"
    ON public.accounting_invoices FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            LEFT JOIN tenant_members tm ON p.tenant_id = tm.tenant_id
            WHERE p.user_id = auth.uid() OR tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage transactions for their projects"
    ON public.accounting_transactions FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            LEFT JOIN tenant_members tm ON p.tenant_id = tm.tenant_id
            WHERE p.user_id = auth.uid() OR tm.user_id = auth.uid()
        )
    );

