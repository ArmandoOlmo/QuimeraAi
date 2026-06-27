import { describe, expect, it } from 'vitest';

import { getPortalReportDeliveryStatus } from '../../components/dashboard/agency/agencyActivityDisplay';
import type { ActivityEvent } from '../../hooks/useAgencyMetrics';

const buildActivity = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
    id: 'activity-1',
    type: 'report_generated',
    clientId: 'client-1',
    description: 'Monthly report generated',
    timestamp: new Date('2026-06-27T00:00:00.000Z'),
    ...overrides,
});

describe('agency activity display helpers', () => {
    it('surfaces portal delivery only for visible client-facing report activity', () => {
        expect(getPortalReportDeliveryStatus(buildActivity({
            metadata: {
                clientPortalVisible: true,
                portalPublicationStatus: 'sent',
            },
        }))).toBe('sent');

        expect(getPortalReportDeliveryStatus(buildActivity({
            metadata: {
                clientPortalVisible: true,
                portalPublicationStatus: 'published',
            },
        }))).toBe('published');

        expect(getPortalReportDeliveryStatus(buildActivity({
            metadata: {
                clientPortalVisible: false,
                portalPublicationStatus: 'sent',
            },
        }))).toBeNull();

        expect(getPortalReportDeliveryStatus(buildActivity({
            type: 'client_created',
            metadata: {
                clientPortalVisible: true,
                portalPublicationStatus: 'sent',
            },
        }))).toBeNull();
    });
});
