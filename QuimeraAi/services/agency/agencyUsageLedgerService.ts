export interface AgencyFinancialMetrics {
    ledgerRevenue: number;
    baseCost: number;
    markup: number;
    margin: number;
    marginPercentage: number;
    ledgerEntryCount: number;
    openPaymentLinks: number;
    pendingApprovals: number;
    pastDueClients: number;
    billingEventCount: number;
}

export interface AgencyFinanceClient {
    id: string;
    agencyPlanId?: string | null;
    billing?: Record<string, any> | null;
    billingInfo?: Record<string, any> | null;
}

export interface AgencyUsageLedgerRow {
    source_module?: string | null;
    usage_quantity?: unknown;
    unit_price?: unknown;
    client_price?: unknown;
    unit_cost?: unknown;
    revenue_amount?: unknown;
    platform_cost?: unknown;
    markup_amount?: unknown;
    margin_amount?: unknown;
    billing_status?: string | null;
}

export interface AgencyServicePlanCostRow {
    id: string;
    price?: unknown;
    base_cost?: unknown;
}

export const AGENCY_USAGE_LEDGER_FINANCE_SELECT = [
    'source_module',
    'usage_quantity',
    'unit_price',
    'client_price',
    'unit_cost',
    'revenue_amount',
    'platform_cost',
    'markup_amount',
    'margin_amount',
    'billing_status',
].join(',');

export const AGENCY_SERVICE_PLAN_COST_SELECT = 'id,price,base_cost';

export function getEmptyAgencyFinanceMetrics(): AgencyFinancialMetrics {
    return {
        ledgerRevenue: 0,
        baseCost: 0,
        markup: 0,
        margin: 0,
        marginPercentage: 0,
        ledgerEntryCount: 0,
        openPaymentLinks: 0,
        pendingApprovals: 0,
        pastDueClients: 0,
        billingEventCount: 0,
    };
}

export function isMissingAgencyProductionTable(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | null;
    const message = String(err?.message || '').toLowerCase();
    return err?.code === '42P01' ||
        err?.code === 'PGRST205' ||
        message.includes('could not find the table') ||
        message.includes('does not exist');
}

export function readFiniteMoney(value: unknown): number {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

export function calculateMarginPercentage(revenue: number, margin: number): number {
    return revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0;
}

export function readClientMrr(client: AgencyFinanceClient): number {
    const values = [
        client.billing?.mrr,
        client.billing?.monthlyPrice,
        client.billingInfo?.mrr,
    ];

    for (const value of values) {
        const amount = Number(value);
        if (Number.isFinite(amount) && amount > 0) return amount;
    }

    return 0;
}

export function calculatePastDueClientCount(clients: AgencyFinanceClient[]): number {
    return clients.filter(client => {
        const status = String(client.billing?.subscriptionStatus || client.billing?.status || '').toLowerCase();
        return status === 'past_due' || status === 'unpaid' || status === 'payment_failed';
    }).length;
}

export function summarizeAgencyUsageLedgerRows(rows: AgencyUsageLedgerRow[]): Pick<AgencyFinancialMetrics, 'ledgerRevenue' | 'baseCost' | 'markup' | 'margin' | 'marginPercentage' | 'ledgerEntryCount'> {
    const summary = {
        ledgerRevenue: 0,
        baseCost: 0,
        markup: 0,
        margin: 0,
        marginPercentage: 0,
        ledgerEntryCount: 0,
    };

    rows.forEach(row => {
        const quantity = readFiniteMoney(row.usage_quantity) || 1;
        const unitPrice = readFiniteMoney(row.client_price) || readFiniteMoney(row.unit_price);
        const unitCost = readFiniteMoney(row.unit_cost);
        const revenue = readFiniteMoney(row.revenue_amount) || quantity * unitPrice;
        const cost = readFiniteMoney(row.platform_cost) || quantity * unitCost;
        const margin = readFiniteMoney(row.margin_amount) || revenue - cost;
        const markup = readFiniteMoney(row.markup_amount) || margin;

        summary.ledgerEntryCount += 1;
        summary.ledgerRevenue += revenue;
        summary.baseCost += cost;
        summary.margin += margin;
        summary.markup += markup;
    });

    summary.marginPercentage = calculateMarginPercentage(summary.ledgerRevenue, summary.margin);
    return summary;
}

export function summarizeFallbackPlanFinance(
    clients: AgencyFinanceClient[],
    planRows: AgencyServicePlanCostRow[],
): Pick<AgencyFinancialMetrics, 'ledgerRevenue' | 'baseCost' | 'markup' | 'margin' | 'marginPercentage'> {
    const plansById = new Map<string, { price: number; baseCost: number }>();
    planRows.forEach(row => {
        plansById.set(row.id, {
            price: readFiniteMoney(row.price),
            baseCost: readFiniteMoney(row.base_cost),
        });
    });

    const summary = {
        ledgerRevenue: 0,
        baseCost: 0,
        markup: 0,
        margin: 0,
        marginPercentage: 0,
    };

    clients.forEach(client => {
        const plan = client.agencyPlanId ? plansById.get(client.agencyPlanId) : undefined;
        const revenue = readClientMrr(client) || Number(plan?.price || 0);
        const baseCost = Number(plan?.baseCost || 0);

        summary.ledgerRevenue += revenue;
        summary.baseCost += baseCost;
    });

    summary.margin = summary.ledgerRevenue - summary.baseCost;
    summary.markup = summary.margin;
    summary.marginPercentage = calculateMarginPercentage(summary.ledgerRevenue, summary.margin);
    return summary;
}

export async function fetchAgencyFinanceMetrics(
    client: any,
    agencyTenantId: string,
    subClients: AgencyFinanceClient[],
): Promise<AgencyFinancialMetrics> {
    const finance = getEmptyAgencyFinanceMetrics();
    finance.pastDueClients = calculatePastDueClientCount(subClients);

    const { data: ledgerRows, error: ledgerError } = await client
        .from('agency_usage_ledger')
        .select(AGENCY_USAGE_LEDGER_FINANCE_SELECT)
        .eq('agency_tenant_id', agencyTenantId);

    if (ledgerError && !isMissingAgencyProductionTable(ledgerError)) {
        throw ledgerError;
    }

    if (!ledgerError && ledgerRows?.length) {
        Object.assign(finance, summarizeAgencyUsageLedgerRows(ledgerRows));
    } else if (subClients.length > 0) {
        const planIds = Array.from(new Set(
            subClients
                .map(clientRow => clientRow.agencyPlanId)
                .filter(Boolean) as string[],
        ));
        let planRows: AgencyServicePlanCostRow[] = [];

        if (planIds.length > 0) {
            const { data, error: plansError } = await client
                .from('agency_service_plans')
                .select(AGENCY_SERVICE_PLAN_COST_SELECT)
                .in('id', planIds);

            if (plansError && !isMissingAgencyProductionTable(plansError)) {
                throw plansError;
            }
            planRows = data || [];
        }

        Object.assign(finance, summarizeFallbackPlanFinance(subClients, planRows));
    }

    const { count: openPaymentLinks, error: paymentLinksError } = await client
        .from('agency_client_payment_links')
        .select('id', { count: 'exact', head: true })
        .eq('agency_tenant_id', agencyTenantId)
        .eq('status', 'pending');
    if (paymentLinksError && !isMissingAgencyProductionTable(paymentLinksError)) throw paymentLinksError;
    finance.openPaymentLinks = openPaymentLinks || 0;

    const { count: pendingApprovals, error: approvalsError } = await client
        .from('agency_client_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('agency_tenant_id', agencyTenantId)
        .eq('status', 'pending');
    if (approvalsError && !isMissingAgencyProductionTable(approvalsError)) throw approvalsError;
    finance.pendingApprovals = pendingApprovals || 0;

    const { count: billingEventCount, error: billingEventsError } = await client
        .from('agency_billing_events')
        .select('id', { count: 'exact', head: true })
        .eq('agency_tenant_id', agencyTenantId);
    if (billingEventsError && !isMissingAgencyProductionTable(billingEventsError)) throw billingEventsError;
    finance.billingEventCount = billingEventCount || 0;
    finance.marginPercentage = calculateMarginPercentage(finance.ledgerRevenue, finance.margin);

    return finance;
}
