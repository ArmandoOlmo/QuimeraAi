import { describe, expect, it } from 'vitest';
import {
    appendChatbotCustomerRequestNotes,
    buildReadableChatbotCustomerRequestNote,
    buildChatbotCustomerRequestNotes,
} from '../../utils/chatbotEngine/customerRequestNotes';

describe('chatbot customer request notes', () => {
    it('builds a bilingual detailed note from customer intent and transcript context', () => {
        const notes = buildChatbotCustomerRequestNotes({
            projectName: 'Ganova',
            agentName: 'ChatCore',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            customer: {
                name: 'Ana Cliente',
                email: 'ana@example.com',
                phone: '+1 787 555 0101',
            },
            customerProvidedNotes: 'Quiere reservar una consulta para ver paquetes premium.',
            appointmentTitle: 'Consulta con Ana Cliente',
            appointmentDateTime: '2026-07-01T14:00:00.000Z',
            intentAnalysis: {
                customerInterest: 'Paquetes premium y disponibilidad de citas',
                urgency: 'high',
                recommendedAction: 'Confirmar servicio y enviar cotizacion',
                intentScore: 88,
            },
            messages: [
                { role: 'model', text: 'Hola, soy tu asistente.' },
                { role: 'user', text: 'Necesito una cita y quiero saber el precio del paquete premium.' },
            ],
            locale: 'es',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(notes).toContain('ES: El cliente Ana Cliente, ana@example.com, +1 787 555 0101 quiere: Quiere reservar una consulta para ver paquetes premium.');
        expect(notes).toContain('EN: The customer Ana Cliente, ana@example.com, +1 787 555 0101 wants: Quiere reservar una consulta para ver paquetes premium.');
        expect(notes).toContain('Quiere reservar una consulta para ver paquetes premium.');
        expect(notes).toContain('Prioridad: alta');
        expect(notes).toContain('Priority: high');
        expect(notes).toContain('Próximo paso sugerido: Confirmar servicio y enviar cotizacion');
        expect(notes).toContain('Suggested next step: Confirmar servicio y enviar cotizacion');
        expect(notes).toContain('1 de julio de 2026');
        expect(notes).not.toContain('Score:');
        expect(notes).not.toContain('Generado en / Generated at');
        expect(notes).not.toContain('2026-07-01T14:00:00.000Z');
    });

    it('appends notes without duplicating the same generated summary', () => {
        const generated = buildChatbotCustomerRequestNotes({
            projectName: 'Ganova',
            customerProvidedNotes: 'Quiere una demostracion del producto.',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(appendChatbotCustomerRequestNotes('Nota previa', generated)).toContain('Nota previa\n\nResumen de solicitud');
        expect(appendChatbotCustomerRequestNotes(generated, generated)).toBe(generated);
    });

    it('converts technical generated summaries into readable bilingual follow-up notes', () => {
        const generated = buildChatbotCustomerRequestNotes({
            projectName: 'Ganova',
            customer: {
                name: 'Luis Rivera',
                email: 'luis@example.com',
            },
            customerProvidedNotes: 'Quiere comparar paquetes premium antes de reservar.',
            appointmentTitle: 'Consulta premium',
            appointmentDateTime: '2026-07-04T15:00:00.000Z',
            intentAnalysis: {
                urgency: 'medium',
                recommendedAction: 'Enviar opciones y confirmar disponibilidad',
            },
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        const readable = buildReadableChatbotCustomerRequestNote(generated);

        expect(readable).toContain('Resumen de seguimiento / Follow-up summary');
        expect(readable).toContain('ES: El cliente Luis Rivera, luis@example.com quiere: Quiere comparar paquetes premium antes de reservar.');
        expect(readable).toContain('EN: The customer Luis Rivera, luis@example.com wants: Quiere comparar paquetes premium antes de reservar.');
        expect(readable).toContain('4 de julio de 2026');
        expect(readable).not.toContain('Proyecto / Project');
        expect(readable).not.toContain('Generado en / Generated at');
        expect(readable).not.toContain('2026-07-04T15:00:00.000Z');
    });

    it('builds detailed notes from voice appointment transcripts', () => {
        const notes = buildChatbotCustomerRequestNotes({
            projectName: 'Ganova',
            agentName: 'ChatCore Voice',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            customer: {
                name: 'Carlos Rivera',
                email: 'carlos@example.com',
            },
            customerProvidedNotes: [
                'user: Soy Carlos Rivera y quiero una cita manana a las 3pm.',
                'model: Tu cita queda confirmada para manana a las 3pm.',
            ].join('\n'),
            appointmentTitle: 'Cita de voz con Carlos Rivera',
            appointmentDateTime: '2026-07-01T19:00:00.000Z',
            intentAnalysis: {
                customerInterest: 'Agendar una consulta por voz',
                urgency: 'medium',
                recommendedAction: 'Revisar la cita y confirmar disponibilidad',
                intentScore: 74,
            },
            messages: [
                { role: 'user', text: 'Soy Carlos Rivera y quiero una cita manana a las 3pm.' },
                { role: 'model', text: 'Tu cita queda confirmada para manana a las 3pm.' },
            ],
            locale: 'es',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(notes).toContain('Cita: Cita de voz con Carlos Rivera');
        expect(notes).toContain('user: Soy Carlos Rivera');
        expect(notes).toContain('Prioridad: media');
        expect(notes).toContain('Conversation context: Customer: Soy Carlos Rivera');
        expect(notes).not.toContain('Score: 74/100');
        expect(notes).not.toContain('Generado por / Generated by: ChatCore Voice');
    });
});
