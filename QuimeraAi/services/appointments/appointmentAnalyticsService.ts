import type { Appointment, AppointmentEngineAnalytics } from '../../types';

type AppointmentEngineEventName =
    | 'appointment_requested'
    | 'appointment_confirmed'
    | 'appointment_cancelled'
    | 'appointment_completed'
    | 'appointment_no_show'
    | (string & {});

export function buildAppointmentEngineAnalytics(appointments: Appointment[]): AppointmentEngineAnalytics {
    const sourceBreakdown: Record<string, number> = {};
    const eventBreakdown: Record<string, number> = {};
    const paymentStatusBreakdown: Record<string, number> = {};
    const linkedLeadIds = new Set<string>();

    let totalEvents = 0;
    let chatCoreBookings = 0;
    let publicBookings = 0;
    let dashboardBookings = 0;
    let googleCalendarImports = 0;
    let paidBookingCount = 0;
    let depositPendingCount = 0;
    let needsReviewCount = 0;
    let aiPreparedCount = 0;

    for (const appointment of appointments) {
        const sourceKey = normalizeSourceKey(appointment);
        increment(sourceBreakdown, sourceKey);

        if (sourceKey === 'chatcore') chatCoreBookings += 1;
        if (sourceKey === 'public_booking') publicBookings += 1;
        if (sourceKey === 'dashboard') dashboardBookings += 1;
        if (sourceKey === 'google_calendar') googleCalendarImports += 1;

        if (appointment.needsReview) needsReviewCount += 1;
        if (appointment.aiPrepEnabled || appointment.aiInsights) aiPreparedCount += 1;

        collectLinkedLeads(appointment).forEach(leadId => linkedLeadIds.add(leadId));

        const paymentStatus = normalizeString(appointment.paymentStatus);
        if (paymentStatus) {
            increment(paymentStatusBreakdown, paymentStatus);
            if (paymentStatus.includes('deposit') || paymentStatus.includes('paid') || appointment.ecommerceOrderId) {
                paidBookingCount += 1;
            }
            if (paymentStatus.includes('pending')) {
                depositPendingCount += 1;
            }
        } else if (appointment.ecommerceOrderId) {
            paidBookingCount += 1;
            increment(paymentStatusBreakdown, 'linked_order');
        }

        for (const eventName of readIntegrationEventNames(appointment)) {
            totalEvents += 1;
            increment(eventBreakdown, eventName);
        }
    }

    const requestedCount = Math.max(
        eventBreakdown.appointment_requested || 0,
        appointments.length,
    );
    const confirmedCount = Math.max(
        eventBreakdown.appointment_confirmed || 0,
        appointments.filter(appointment => ['confirmed', 'completed', 'no_show'].includes(appointment.status)).length,
    );
    const completedCount = Math.max(
        eventBreakdown.appointment_completed || 0,
        appointments.filter(appointment => appointment.status === 'completed').length,
    );
    const cancelledCount = Math.max(
        eventBreakdown.appointment_cancelled || 0,
        appointments.filter(appointment => appointment.status === 'cancelled').length,
    );
    const noShowCount = Math.max(
        eventBreakdown.appointment_no_show || 0,
        appointments.filter(appointment => appointment.status === 'no_show').length,
    );

    return {
        totalEvents,
        requestedCount,
        confirmedCount,
        completedCount,
        cancelledCount,
        noShowCount,
        needsReviewCount,
        aiPreparedCount,
        chatCoreBookings,
        publicBookings,
        dashboardBookings,
        googleCalendarImports,
        linkedLeadCount: linkedLeadIds.size,
        paidBookingCount,
        depositPendingCount,
        confirmationRate: percent(confirmedCount, requestedCount),
        completionRateFromRequests: percent(completedCount, requestedCount),
        leadLinkRate: percent(linkedLeadIds.size, appointments.length),
        paidBookingRate: percent(paidBookingCount, appointments.length),
        sourceBreakdown,
        eventBreakdown,
        paymentStatusBreakdown,
        funnel: {
            requested: requestedCount,
            confirmed: confirmedCount,
            completed: completedCount,
            cancelled: cancelledCount,
            noShow: noShowCount,
        },
    };
}

function normalizeSourceKey(appointment: Appointment): string {
    const source = normalizeString(appointment.source);
    const sourceModule = normalizeString(appointment.sourceModule);
    const sourceComponent = normalizeString(appointment.sourceComponent);

    if (source === 'chatbot' || sourceModule === 'chatbot' || sourceModule === 'chatcore' || sourceComponent === 'chatcore') return 'chatcore';
    if (source === 'public_booking' || sourceModule === 'website-builder' || sourceComponent === 'publicbooking') return 'public_booking';
    if (source === 'google_calendar') return 'google_calendar';
    if (source === 'dashboard' || sourceModule === 'appointments') return 'dashboard';
    return source || sourceModule || 'dashboard';
}

function collectLinkedLeads(appointment: Appointment): string[] {
    return [
        ...(appointment.linkedLeadIds || []),
        appointment.sourceLeadId || '',
        ...(appointment.participants || []).map(participant => participant.leadId || ''),
    ].filter(Boolean);
}

function readIntegrationEventNames(appointment: Appointment): AppointmentEngineEventName[] {
    const metadata = normalizeRecord(appointment.metadata);
    const integrationEvents = Array.isArray(metadata.integrationEvents) ? metadata.integrationEvents : [];
    return integrationEvents
        .map(event => normalizeString(normalizeRecord(event).eventType))
        .filter(Boolean) as AppointmentEngineEventName[];
}

function normalizeRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function increment(target: Record<string, number>, key: string): void {
    if (!key) return;
    target[key] = (target[key] || 0) + 1;
}

function percent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
}
