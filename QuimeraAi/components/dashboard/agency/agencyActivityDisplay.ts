import type { ActivityEvent } from '../../../hooks/useAgencyMetrics';

export type PortalReportDeliveryStatus = 'sent' | 'published';

function readMetadata(activity: Pick<ActivityEvent, 'metadata'>): Record<string, any> {
    const metadata = activity.metadata;
    if (!metadata) return {};
    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata);
            return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
        } catch {
            return {};
        }
    }
    return typeof metadata === 'object' ? metadata : {};
}

function isTruthy(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
}

export function getPortalReportDeliveryStatus(
    activity: Pick<ActivityEvent, 'type' | 'metadata'>,
): PortalReportDeliveryStatus | null {
    if (activity.type !== 'report_generated') return null;

    const metadata = readMetadata(activity);
    const status = String(metadata.portalPublicationStatus || metadata.reportStatus || '').toLowerCase();
    const clientPortal = metadata.clientPortal && typeof metadata.clientPortal === 'object'
        ? metadata.clientPortal as Record<string, unknown>
        : {};
    const visible = isTruthy(metadata.clientPortalVisible) || isTruthy(clientPortal.visible);

    if (!visible) return null;
    if (status === 'published' || status === 'sent') return status;
    return null;
}
