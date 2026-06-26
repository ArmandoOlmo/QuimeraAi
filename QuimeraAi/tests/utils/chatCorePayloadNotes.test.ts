import { describe, expect, it } from 'vitest';
import {
    buildChatCoreAppointmentPayloadNotes,
    buildChatCoreLeadPayloadNotes,
} from '../../utils/chatbotEngine/chatCorePayloadNotes';

describe('ChatCore payload notes', () => {
    it('normalizes lead payloads into bilingual customer request notes', () => {
        const notes = buildChatCoreLeadPayloadNotes({
            projectName: 'Brasa Prime',
            agentName: 'ChatCore',
            sourceSurface: 'restaurant_menu',
            sourceModule: 'restaurants',
            locale: 'es',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
            leadData: {
                name: 'Luis Rivera',
                email: 'luis@example.com',
                phone: '+1 787 555 0101',
                message: 'Quiero una mesa privada para 8 personas este viernes.',
                aiAnalysis: 'Reserva de evento privado con urgencia media',
                recommendedAction: 'Confirmar disponibilidad y menu',
                aiScore: 84,
            },
        });

        expect(notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(notes).toContain('Proyecto / Project: Brasa Prime');
        expect(notes).toContain('Origen / Source: restaurant_menu - restaurants');
        expect(notes).toContain('Lo que desea el cliente / What the customer wants: Quiero una mesa privada para 8 personas este viernes.');
        expect(notes).toContain('Interes detectado por IA / AI detected interest: Reserva de evento privado con urgencia media');
        expect(notes).toContain('Accion recomendada / Recommended action: Confirmar disponibilidad y menu');
        expect(notes).toContain('Urgencia / Urgency: unknown | Score: 84/100');
    });

    it('normalizes appointment payloads with lead, transcript, and requested time context', () => {
        const notes = buildChatCoreAppointmentPayloadNotes({
            projectName: 'Ganova',
            agentName: 'Ganova AI Agent',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            locale: 'en',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
            appointmentData: {
                title: 'Consultation with Ana',
                description: 'Initial strategy call.',
                notes: 'Ana wants pricing for the premium package before booking.',
                startDate: new Date('2026-07-01T14:00:00.000Z'),
                endDate: new Date('2026-07-01T15:00:00.000Z'),
                participantName: 'Ana Cliente',
                participantEmail: 'ana@example.com',
                linkedLeadId: 'lead-1',
                sourceConversationId: 'conversation-1',
                conversationTranscript: [
                    'Usuario: Necesito una cita y precio del paquete premium.',
                    'Asistente: Puedo ayudarte a coordinarla.',
                ].join('\n'),
            },
        });

        expect(notes).toContain('Cita / Appointment: Consultation with Ana');
        expect(notes).toContain('Fecha solicitada / Requested time: 2026-07-01T14:00:00.000Z');
        expect(notes).toContain('Lead ID: lead-1');
        expect(notes).toContain('Conversacion / Conversation: conversation-1');
        expect(notes).toContain('Lo que desea el cliente / What the customer wants: Ana wants pricing for the premium package before booking.');
        expect(notes).toContain('Resumen de conversacion / Conversation snapshot');
    });

    it('preserves an existing generated summary without duplicating it', () => {
        const generated = buildChatCoreLeadPayloadNotes({
            projectName: 'Quimera',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
            leadData: {
                message: 'Quiere agendar una demo.',
            },
        });

        expect(buildChatCoreLeadPayloadNotes({
            projectName: 'Quimera',
            generatedAt: new Date('2026-06-26T12:01:00.000Z'),
            leadData: {
                notes: generated,
                message: 'Quiere agendar una demo.',
            },
        })).toBe(generated);
    });
});
