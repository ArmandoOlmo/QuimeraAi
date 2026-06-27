import { describe, expect, it } from 'vitest';
import {
    buildAgencyMrrHistory,
    readAgencyAnalyticsClientMrr,
    readAgencyAnalyticsDate,
} from '../../services/agencyAnalyticsService';

describe('agencyAnalyticsService', () => {
    it('reads agency client MRR from canonical billing fallbacks', () => {
        expect(readAgencyAnalyticsClientMrr({ billing: { mrr: 199 } })).toBe(199);
        expect(readAgencyAnalyticsClientMrr({ billing: { monthlyPrice: '149' } })).toBe(149);
        expect(readAgencyAnalyticsClientMrr({ billingInfo: { mrr: 79 } })).toBe(79);
        expect(readAgencyAnalyticsClientMrr({ billing: { mrr: 0 }, billingInfo: { mrr: 59 } })).toBe(59);
        expect(readAgencyAnalyticsClientMrr({ billing: { mrr: -1 } })).toBe(0);
    });

    it('normalizes ISO, Date, and timestamp-like dates', () => {
        expect(readAgencyAnalyticsDate('2026-04-10T12:00:00.000Z')?.toISOString()).toBe('2026-04-10T12:00:00.000Z');
        expect(readAgencyAnalyticsDate(new Date('2026-05-01T00:00:00.000Z'))?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
        expect(readAgencyAnalyticsDate({ seconds: 1780272000 })?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
        expect(readAgencyAnalyticsDate('not-a-date')).toBeNull();
    });

    it('builds MRR history from client activation dates instead of simulated growth', () => {
        const history = buildAgencyMrrHistory([
            {
                id: 'client-a',
                createdAt: '2026-01-15T00:00:00.000Z',
                billing: { mrr: 100 },
            },
            {
                id: 'client-b',
                billing: {
                    checkoutCompletedAt: '2026-03-03T00:00:00.000Z',
                    monthlyPrice: 200,
                },
            },
            {
                id: 'client-c',
                billing: { mrr: 50 },
            },
        ], {
            now: new Date('2026-06-27T12:00:00.000Z'),
            months: 6,
            locale: 'en-US',
        });

        expect(history.map(point => point.month)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
        expect(history.map(point => point.mrr)).toEqual([150, 150, 350, 350, 350, 350]);
        expect(history.map(point => point.clients)).toEqual([2, 2, 3, 3, 3, 3]);
    });

    it('keeps empty agency portfolios at zero instead of inventing MRR', () => {
        expect(buildAgencyMrrHistory([], {
            now: new Date('2026-06-27T12:00:00.000Z'),
            months: 3,
            locale: 'en-US',
        })).toEqual([
            { month: 'Apr', mrr: 0, clients: 0 },
            { month: 'May', mrr: 0, clients: 0 },
            { month: 'Jun', mrr: 0, clients: 0 },
        ]);
    });
});
