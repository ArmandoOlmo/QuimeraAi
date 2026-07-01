import { describe, expect, it } from 'vitest';
import {
    AGENCY_SERVICE_PLAN_COST_SELECT,
    AGENCY_USAGE_LEDGER_FINANCE_SELECT,
    calculateMarginPercentage,
    fetchAgencyFinanceMetrics,
    getEmptyAgencyFinanceMetrics,
    isMissingAgencyProductionTable,
    readClientMrr,
    summarizeAgencyUsageLedgerRows,
    summarizeFallbackPlanFinance,
} from '../../services/agency/agencyUsageLedgerService';

class FakeQuery {
    private filters: Array<[string, unknown]> = [];
    private inFilters: Array<[string, unknown[]]> = [];

    constructor(
        private table: string,
        private fixtures: Record<string, any>,
        private calls: any[],
    ) { }

    select(fields: string, options?: Record<string, unknown>) {
        this.calls.push({ table: this.table, method: 'select', fields, options });
        return this;
    }

    eq(column: string, value: unknown) {
        this.filters.push([column, value]);
        this.calls.push({ table: this.table, method: 'eq', column, value });
        return this;
    }

    in(column: string, values: unknown[]) {
        this.inFilters.push([column, values]);
        this.calls.push({ table: this.table, method: 'in', column, values });
        return this;
    }

    then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        const fixture = this.fixtures[this.table] || {};
        if (fixture.error) return { data: null, error: fixture.error, count: null };
        if ('count' in fixture) return { data: fixture.data || null, error: null, count: fixture.count };
        return { data: fixture.data || [], error: null, count: fixture.count ?? null };
    }
}

function createClient(fixtures: Record<string, any>) {
    const calls: any[] = [];
    return {
        calls,
        from(table: string) {
            calls.push({ table, method: 'from' });
            return new FakeQuery(table, fixtures, calls);
        },
    };
}

describe('agencyUsageLedgerService', () => {
    it('summarizes generated ledger amounts and falls back to unit math when generated fields are absent', () => {
        const summary = summarizeAgencyUsageLedgerRows([
            {
                usage_quantity: 2,
                unit_price: 100,
                unit_cost: 40,
                revenue_amount: 220,
                platform_cost: 80,
                margin_amount: 140,
            },
            {
                usage_quantity: 3,
                unit_price: 50,
                client_price: 60,
                unit_cost: 10,
            },
        ]);

        expect(summary).toEqual({
            ledgerEntryCount: 2,
            ledgerRevenue: 400,
            baseCost: 110,
            markup: 290,
            margin: 290,
            marginPercentage: 72.5,
        });
    });

    it('calculates fallback finance from client MRR and agency service plan cost without raw ledger rows', () => {
        expect(readClientMrr({ id: 'client-1', billing: { monthlyPrice: 250 } })).toBe(250);
        expect(calculateMarginPercentage(250, 150)).toBe(60);
        expect(getEmptyAgencyFinanceMetrics()).toMatchObject({ ledgerRevenue: 0, margin: 0 });

        const summary = summarizeFallbackPlanFinance([
            { id: 'client-1', agencyPlanId: 'plan-a', billing: { monthlyPrice: 250 } },
            { id: 'client-2', agencyPlanId: 'plan-b', billing: {} },
        ], [
            { id: 'plan-a', price: 225, base_cost: 100 },
            { id: 'plan-b', price: 300, base_cost: 120 },
        ]);

        expect(summary).toEqual({
            ledgerRevenue: 550,
            baseCost: 220,
            markup: 330,
            margin: 330,
            marginPercentage: 60,
        });
    });

    it('fetches Agency finance with explicit internal selects and operational counts', async () => {
        const client = createClient({
            agency_usage_ledger: {
                data: [{
                    usage_quantity: 1,
                    revenue_amount: 300,
                    platform_cost: 125,
                    margin_amount: 175,
                }],
            },
            agency_client_payment_links: { count: 2 },
            agency_client_approvals: { count: 3 },
            agency_billing_events: { count: 4 },
        });

        const finance = await fetchAgencyFinanceMetrics(client, 'agency-1', [
            { id: 'client-1', billing: { status: 'past_due' } },
        ]);

        expect(finance).toMatchObject({
            ledgerRevenue: 300,
            baseCost: 125,
            margin: 175,
            markup: 175,
            ledgerEntryCount: 1,
            pastDueClients: 1,
            openPaymentLinks: 2,
            pendingApprovals: 3,
            billingEventCount: 4,
        });
        expect(client.calls).toEqual(expect.arrayContaining([
            expect.objectContaining({ table: 'agency_usage_ledger', method: 'select', fields: AGENCY_USAGE_LEDGER_FINANCE_SELECT }),
            expect.objectContaining({ table: 'agency_client_payment_links', method: 'select', fields: 'id', options: { count: 'exact', head: true } }),
            expect.objectContaining({ table: 'agency_client_approvals', method: 'select', fields: 'id', options: { count: 'exact', head: true } }),
            expect.objectContaining({ table: 'agency_billing_events', method: 'select', fields: 'id', options: { count: 'exact', head: true } }),
        ]));
    });

    it('falls back to service-plan pricing only when the raw usage ledger table is missing', async () => {
        const client = createClient({
            agency_usage_ledger: { error: { code: '42P01', message: 'missing table' } },
            agency_service_plans: { data: [{ id: 'plan-a', price: 400, base_cost: 160 }] },
            agency_client_payment_links: { count: 0 },
            agency_client_approvals: { count: 0 },
            agency_billing_events: { count: 0 },
        });

        const finance = await fetchAgencyFinanceMetrics(client, 'agency-1', [
            { id: 'client-1', agencyPlanId: 'plan-a', billing: {} },
        ]);

        expect(finance).toMatchObject({
            ledgerRevenue: 400,
            baseCost: 160,
            margin: 240,
            markup: 240,
            marginPercentage: 60,
        });
        expect(client.calls).toEqual(expect.arrayContaining([
            expect.objectContaining({ table: 'agency_service_plans', method: 'select', fields: AGENCY_SERVICE_PLAN_COST_SELECT }),
        ]));
    });

    it('does not treat permission errors as missing Agency production tables', () => {
        expect(isMissingAgencyProductionTable({ code: '42P01', message: 'missing' })).toBe(true);
        expect(isMissingAgencyProductionTable({ code: 'PGRST205', message: 'schema cache' })).toBe(true);
        expect(isMissingAgencyProductionTable({ code: '42501', message: 'permission denied for table agency_usage_ledger' })).toBe(false);
    });
});
