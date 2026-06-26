import { describe, expect, it } from 'vitest';
import {
    appendChatbotCustomerRequestNotes,
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
        expect(notes).toContain('Lo que desea el cliente / What the customer wants');
        expect(notes).toContain('Quiere reservar una consulta para ver paquetes premium.');
        expect(notes).toContain('Urgencia / Urgency: high | Score: 88/100');
        expect(notes).toContain('Accion recomendada / Recommended action: Confirmar servicio y enviar cotizacion');
        expect(notes).toContain('Cliente / Customer: Ana Cliente | ana@example.com | +1 787 555 0101');
        expect(notes).toContain('Resumen de conversacion / Conversation snapshot');
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
});
