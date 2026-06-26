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
        expect(notes).toContain('Proyecto / Project: Brasa Prime');
        expect(notes).toContain('Origen / Source: restaurant_menu - restaurants');
        expect(notes).toContain('Cliente / Customer: Luis Rivera | luis@example.com | +1 787 555 0111');
        expect(notes).toContain('Lo que desea el cliente / What the customer wants: Necesito cotizacion para una mesa privada esta noche.');
        expect(notes).toContain('Interes detectado por IA / AI detected interest: Reserva urgente para cena privada');
        expect(notes).toContain('Accion recomendada / Recommended action: Confirmar disponibilidad y llamar al cliente');
        expect(notes).toContain('Urgencia / Urgency: unknown | Score: 91/100');
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

        expect(notes).toContain('Cita / Appointment: Showing con Maria Gomez');
        expect(notes).toContain('Fecha solicitada / Requested time: 2026-07-02T19:00:00.000Z');
        expect(notes).toContain('Lo que desea el cliente / What the customer wants: Prefiero despues de las 3pm.');
        expect(notes).toContain('Resumen de conversacion / Conversation snapshot');
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
