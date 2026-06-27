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
        expect(notes).toContain('Español / Spanish');
        expect(notes).toContain('English / Inglés');
        expect(notes).toContain('- Cliente: Luis Rivera, luis@example.com, +1 787 555 0101.');
        expect(notes).toContain('- Lo que desea: Quiero una mesa privada para 8 personas este viernes.');
        expect(notes).toContain('- Customer: Luis Rivera, luis@example.com, +1 787 555 0101.');
        expect(notes).toContain('- Request: Quiero una mesa privada para 8 personas este viernes.');
        expect(notes).toContain('- Próximo paso sugerido: Confirmar disponibilidad y menu.');
        expect(notes).not.toContain('Proyecto / Project');
        expect(notes).not.toContain('Origen / Source');
        expect(notes).not.toContain('Score:');
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

        expect(notes).toContain('- Cita: Consultation with Ana.');
        expect(notes).toContain('- Appointment: Consultation with Ana.');
        expect(notes).toContain('July 1, 2026 at 2:00 PM');
        expect(notes).toContain('Ana wants pricing for the premium package before booking.');
        expect(notes).toContain('- Contexto de la conversación:');
        expect(notes).not.toContain('Fecha solicitada / Requested time');
        expect(notes).not.toContain('Lead ID: lead-1');
        expect(notes).not.toContain('Conversacion / Conversation');
        expect(notes).not.toContain('2026-07-01T14:00:00.000Z');
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
