import { describe, expect, it } from 'vitest';
import {
    appendWidgetCustomerRequestNotes,
    buildWidgetCustomerRequestNotes,
    normalizeWidgetCustomerRequestMessages,
} from '../../utils/chatbotEngine/widgetCustomerRequestNotes';

describe('widget customer request notes', () => {
    it('builds detailed bilingual notes from a direct lead payload', () => {
        const notes = buildWidgetCustomerRequestNotes({
            body: {
                name: 'Luis Rivera',
                email: 'luis@example.com',
                phone: '+1 787 555 0111',
                message: 'Necesito cotizacion para una mesa privada esta noche.',
                aiAnalysis: 'Reserva urgente para cena privada',
                recommendedAction: 'Confirmar disponibilidad y llamar al cliente',
                aiScore: 91,
                sourceSurface: 'restaurant_menu',
                sourceModule: 'restaurants',
            },
            projectName: 'Brasa Prime',
            agentName: 'ChatCore',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(notes).toContain('ES: El cliente Luis Rivera, luis@example.com, +1 787 555 0111 quiere: Necesito cotizacion para una mesa privada esta noche.');
        expect(notes).toContain('EN: The customer Luis Rivera, luis@example.com, +1 787 555 0111 wants: Necesito cotizacion para una mesa privada esta noche.');
        expect(notes).toContain('Próximo paso sugerido: Confirmar disponibilidad y llamar al cliente');
        expect(notes).not.toContain('Proyecto / Project');
        expect(notes).not.toContain('Origen / Source');
        expect(notes).not.toContain('Score:');
    });

    it('extracts transcript messages for appointment summaries', () => {
        const messages = normalizeWidgetCustomerRequestMessages({
            conversationTranscript: [
                'Usuario: Quiero visitar la propiedad el martes.',
                'Asistente: Claro, puedo ayudarte.',
                'Cliente: Prefiero despues de las 3pm.',
            ].join('\n'),
        });

        expect(messages).toEqual([
            { role: 'user', text: 'Quiero visitar la propiedad el martes.' },
            { role: 'model', text: 'Claro, puedo ayudarte.' },
            { role: 'user', text: 'Prefiero despues de las 3pm.' },
        ]);

        const notes = buildWidgetCustomerRequestNotes({
            body: {
                participantName: 'Maria Gomez',
                participantEmail: 'maria@example.com',
                conversationTranscript: [
                    'Usuario: Quiero visitar la propiedad el martes.',
                    'Asistente: Claro, puedo ayudarte.',
                    'Cliente: Prefiero despues de las 3pm.',
                ].join('\n'),
                locale: 'es',
            },
            projectName: 'Ganova Realty',
            sourceSurface: 'realty_property',
            sourceModule: 'realty',
            appointmentTitle: 'Showing con Maria Gomez',
            appointmentDateTime: '2026-07-02T19:00:00.000Z',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(notes).toContain('Cita: Showing con Maria Gomez');
        expect(notes).toContain('Appointment: Showing con Maria Gomez');
        expect(notes).toContain('2 de julio de 2026');
        expect(notes).toContain('July 2, 2026 at 7:00 PM');
        expect(notes).toContain('Prefiero despues de las 3pm.');
        expect(notes).toContain('Contexto de la conversación');
        expect(notes).not.toContain('Fecha solicitada / Requested time');
        expect(notes).not.toContain('2026-07-02T19:00:00.000Z');
    });

    it('does not duplicate an existing generated summary', () => {
        const generated = buildWidgetCustomerRequestNotes({
            body: {
                message: 'Quiere agendar una demo.',
            },
            projectName: 'Quimera',
            generatedAt: new Date('2026-06-26T12:00:00.000Z'),
        });

        expect(appendWidgetCustomerRequestNotes(generated, {
            body: {
                notes: generated,
                message: 'Quiere agendar una demo.',
            },
            projectName: 'Quimera',
            generatedAt: new Date('2026-06-26T12:01:00.000Z'),
        })).toBe(generated);
    });
});
