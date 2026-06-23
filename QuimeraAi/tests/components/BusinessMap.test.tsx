import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessMap from '../../components/BusinessMap';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'en-US' },
        t: (_key: string, fallback: string) => fallback,
    }),
}));

describe('BusinessMap', () => {
    it('renders editor i18n map fields without crashing', () => {
        render(
            <BusinessMap
                title={{ es: 'Ubicacion', en: 'Location' } as any}
                description={{ es: 'Visitanos', en: 'Visit us' } as any}
                address={{ es: '123 Calle Principal, San Juan', en: '123 Main St, San Juan' } as any}
                phone={{ es: '+1 787 555 1234', en: '+1 787 555 1234' } as any}
                email={{ es: 'hello@example.com', en: 'hello@example.com' } as any}
                businessHours={{ es: 'Lun-Vie 9:00-18:00', en: 'Mon-Fri 9:00-18:00' } as any}
                buttonText={{ es: 'Como llegar', en: 'Get directions' } as any}
                lat={18.4655}
                lng={-66.1057}
                zoom={14}
                mapVariant="modern"
                apiKey=""
                paddingY="md"
                paddingX="md"
                height={400}
                colors={{
                    background: '#ffffff',
                    text: '#334155',
                    heading: '#0f172a',
                    accent: '#2563eb',
                    cardBackground: '#f8fafc',
                    buttonBackground: '#111827',
                    buttonText: '#ffffff',
                }}
            />
        );

        expect(screen.getByText('Visit us')).toBeInTheDocument();
        expect(screen.getAllByText('123 Main St, San Juan').length).toBeGreaterThan(0);
        expect(screen.getByText('Get directions')).toBeInTheDocument();
    });
});
