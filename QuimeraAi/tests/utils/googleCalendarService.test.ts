import { describe, expect, it } from 'vitest';
import { googleEventToAppointment } from '../../utils/googleCalendarService';

describe('googleCalendarService', () => {
    it('maps imported Google events to canonical google_calendar appointments', () => {
        const appointment = googleEventToAppointment({
            id: 'google-event-1',
            summary: 'Google discovery call',
            description: 'Discuss project scope\n\n🏷️ #sales #discovery',
            start: {
                dateTime: '2026-07-08T14:00:00.000Z',
                timeZone: 'America/Puerto_Rico',
            },
            end: {
                dateTime: '2026-07-08T15:00:00.000Z',
                timeZone: 'America/Puerto_Rico',
            },
            attendees: [{
                email: 'ana@example.com',
                displayName: 'Ana Client',
                responseStatus: 'accepted',
            }],
            reminders: {
                useDefault: false,
                overrides: [{ method: 'email', minutes: 60 }],
            },
            extendedProperties: {
                private: {
                    quimeraType: 'discovery',
                    quimeraPriority: 'high',
                    quimeraStatus: 'confirmed',
                },
            },
            htmlLink: 'https://calendar.google.com/event?eid=google-event-1',
            iCalUID: 'ical-1',
            etag: 'etag-1',
            status: 'confirmed',
            created: '2026-07-01T12:00:00.000Z',
            updated: '2026-07-02T12:00:00.000Z',
            creator: { email: 'owner@example.com' },
            organizer: { email: 'owner@example.com' },
        } as any, 'primary');

        expect(appointment).toMatchObject({
            title: 'Google discovery call',
            description: 'Discuss project scope',
            type: 'discovery',
            status: 'confirmed',
            priority: 'high',
            source: 'google_calendar',
            sourceModule: 'appointments',
            sourceComponent: 'GoogleCalendar',
            syncKey: 'google_calendar:primary:google-event-1',
            idempotencyKey: 'google_calendar:primary:google-event-1',
            createdBySystem: true,
            needsReview: true,
            googleSync: {
                enabled: true,
                googleEventId: 'google-event-1',
                googleCalendarId: 'primary',
                syncStatus: 'synced',
                htmlLink: 'https://calendar.google.com/event?eid=google-event-1',
                iCalUID: 'ical-1',
                etag: 'etag-1',
            },
            metadata: {
                source: 'google_calendar',
                sourceComponent: 'GoogleCalendar',
                syncKey: 'google_calendar:primary:google-event-1',
                googleCalendar: {
                    calendarId: 'primary',
                    eventId: 'google-event-1',
                    iCalUID: 'ical-1',
                    etag: 'etag-1',
                    status: 'confirmed',
                    creatorEmail: 'owner@example.com',
                    organizerEmail: 'owner@example.com',
                },
            },
        });
        expect(appointment.participants?.[0]).toMatchObject({
            name: 'Ana Client',
            email: 'ana@example.com',
            status: 'accepted',
        });
        expect(appointment.tags).toEqual(['sales', 'discovery']);
    });
});
