import { describe, expect, it } from 'vitest';
import { buildAppointmentEngineAnalytics } from '../../services/appointments/appointmentAnalyticsService';
import type { Appointment } from '../../types';

const timestamp = { seconds: 1782914400, nanoseconds: 0 };

function appointment(overrides: Partial<Appointment>): Appointment {
    return {
        id: overrides.id || 'appointment-1',
        title: overrides.title || 'Appointment',
        description: '',
        type: 'meeting',
        status: 'pending',
        priority: 'medium',
        startDate: timestamp,
        endDate: { seconds: timestamp.seconds + 3600, nanoseconds: 0 },
        timezone: 'America/Puerto_Rico',
        organizerId: 'user-1',
        participants: [],
        location: { type: 'virtual' },
        reminders: [],
        attachments: [],
        notes: [],
        followUpActions: [],
        createdAt: timestamp,
        createdBy: 'user-1',
        ...overrides,
    } as Appointment;
}

describe('appointmentAnalyticsService', () => {
    it('builds canonical Appointments Engine funnel and source analytics', () => {
        const analytics = buildAppointmentEngineAnalytics([
            appointment({
                id: 'chatcore-1',
                status: 'confirmed',
                source: 'chatbot',
                sourceComponent: 'ChatCore',
                sourceModule: 'chatcore',
                linkedLeadIds: ['lead-1'],
                paymentStatus: 'deposit_pending',
                ecommerceOrderId: 'order-1',
                metadata: {
                    integrationEvents: [
                        { eventType: 'appointment_requested' },
                        { eventType: 'appointment_confirmed' },
                    ],
                },
            }),
            appointment({
                id: 'public-1',
                source: 'public_booking',
                sourceModule: 'website-builder',
                needsReview: true,
                metadata: {
                    integrationEvents: [
                        { eventType: 'appointment_requested' },
                    ],
                },
            }),
            appointment({
                id: 'dashboard-1',
                status: 'completed',
                source: 'dashboard',
                linkedLeadIds: ['lead-2'],
                aiPrepEnabled: true,
                metadata: {
                    integrationEvents: [
                        { eventType: 'appointment_requested' },
                        { eventType: 'appointment_confirmed' },
                        { eventType: 'appointment_completed' },
                    ],
                },
            }),
            appointment({
                id: 'google-1',
                status: 'cancelled',
                source: 'google_calendar',
            }),
        ]);

        expect(analytics.sourceBreakdown).toMatchObject({
            chatcore: 1,
            public_booking: 1,
            dashboard: 1,
            google_calendar: 1,
        });
        expect(analytics.eventBreakdown).toMatchObject({
            appointment_requested: 3,
            appointment_confirmed: 2,
            appointment_completed: 1,
        });
        expect(analytics.funnel).toMatchObject({
            requested: 4,
            confirmed: 2,
            completed: 1,
            cancelled: 1,
            noShow: 0,
        });
        expect(analytics).toMatchObject({
            totalEvents: 6,
            chatCoreBookings: 1,
            publicBookings: 1,
            dashboardBookings: 1,
            googleCalendarImports: 1,
            linkedLeadCount: 2,
            paidBookingCount: 1,
            depositPendingCount: 1,
            needsReviewCount: 1,
            aiPreparedCount: 1,
            confirmationRate: 50,
            leadLinkRate: 50,
            paidBookingRate: 25,
        });
    });
});
