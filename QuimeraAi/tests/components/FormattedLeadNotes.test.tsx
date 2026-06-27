import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormattedLeadNotes from '../../components/dashboard/leads/FormattedLeadNotes';

describe('FormattedLeadNotes', () => {
    it('renders ChatCore notes as document sections with bullets', () => {
        render(
            <FormattedLeadNotes
                notes={[
                    'Resumen de seguimiento / Follow-up summary',
                    '',
                    'Español / Spanish',
                    '',
                    '- Cliente: Ana Cliente, ana@example.com.',
                    '- Lo que desea: Quiere una consulta premium.',
                    '- Contexto de la conversación:',
                    '  - Cliente: Necesito precio y disponibilidad.',
                    '',
                    'English / Inglés',
                    '',
                    '- Customer: Ana Cliente, ana@example.com.',
                    '- Request: Quiere una consulta premium.',
                ].join('\n')}
            />
        );

        expect(screen.getByText('Resumen de seguimiento / Follow-up summary')).toBeInTheDocument();
        expect(screen.getByText('Español / Spanish')).toBeInTheDocument();
        expect(screen.getByText('English / Inglés')).toBeInTheDocument();
        expect(screen.getByText('Cliente: Ana Cliente, ana@example.com.')).toBeInTheDocument();
        expect(screen.getByText('Lo que desea: Quiere una consulta premium.')).toBeInTheDocument();
        expect(screen.getByText('Cliente: Necesito precio y disponibilidad.')).toBeInTheDocument();
        expect(screen.getByText('Request: Quiere una consulta premium.')).toBeInTheDocument();
    });

    it('shows an empty state when the lead has no notes', () => {
        render(<FormattedLeadNotes notes="" emptyText="Sin notas todavía." />);

        expect(screen.getByText('Sin notas todavía.')).toBeInTheDocument();
    });
});
