import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessMap from '../../components/BusinessMap';
import { MapData } from '../../types';

const mapsApiState = vi.hoisted(() => ({
    isLoaded: false,
    loadError: null as Error | null,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback || _key,
        i18n: { language: 'es' },
    }),
}));

vi.mock('@react-google-maps/api', () => ({
    GoogleMap: () => null,
    Marker: () => null,
    useJsApiLoader: () => mapsApiState,
}));

const baseMapData: MapData = {
    title: 'Location',
    description: 'Find us here',
    address: '123 Main Street',
    lat: 0,
    lng: 0,
    zoom: 15,
    mapVariant: 'minimal',
    apiKey: '',
    paddingY: 'md',
    paddingX: 'md',
    height: 400,
    colors: {
        background: '#0f172a',
        text: '#94a3b8',
        heading: '#f8fafc',
        accent: '#4f46e5',
        cardBackground: '#111827',
        buttonBackground: '#4f46e5',
        buttonText: '#ffffff',
    },
};

describe('BusinessMap', () => {
    it('resolves i18n map fields and renders a real Google Maps iframe when no API key is configured', () => {
        render(
            <BusinessMap
                {...baseMapData}
                title={{ es: 'Oficina', en: 'Office' } as any}
                description={{ es: 'Visitanos', en: 'Visit us' } as any}
                address={{ es: 'Calle Sol 12, San Juan, Puerto Rico', en: '12 Sol Street, San Juan, Puerto Rico' } as any}
                buttonText={{ es: 'Como llegar', en: 'Get directions' } as any}
            />
        );

        const iframe = screen.getByTitle('Oficina');

        expect(screen.getAllByText('Oficina')).toHaveLength(2);
        expect(screen.getByText('Calle Sol 12, San Juan, Puerto Rico')).toBeInTheDocument();
        expect(screen.getByText('Como llegar', { exact: false })).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', expect.stringContaining('https://www.google.com/maps'));
        expect(iframe).toHaveAttribute('src', expect.stringContaining('Calle%20Sol%2012%2C%20San%20Juan%2C%20Puerto%20Rico'));
        expect(screen.queryByText('Interactive map unavailable. Open the address in Google Maps for directions.')).not.toBeInTheDocument();
    });

    it('uses an iframe by address when coordinates are missing even if a JavaScript Maps key exists', () => {
        render(
            <BusinessMap
                {...baseMapData}
                title="Madrid office"
                address="Calle de la Innovacion 42, Madrid, Spain"
                apiKey="AIzaSyLongEnoughGoogleMapsKeyForTesting"
                lat={0}
                lng={0}
            />
        );

        const iframe = screen.getByTitle('Madrid office');

        expect(iframe).toHaveAttribute('src', expect.stringContaining('Calle%20de%20la%20Innovacion%2042%2C%20Madrid%2C%20Spain'));
    });

    it('falls back to the Google Maps iframe if the JavaScript Maps loader fails', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        mapsApiState.loadError = new Error('Google Maps blocked');

        render(
            <BusinessMap
                {...baseMapData}
                title="Coordinate office"
                address="18.4655,-66.1057"
                apiKey="AIzaSyLongEnoughGoogleMapsKeyForTesting"
                lat={18.4655}
                lng={-66.1057}
            />
        );

        const iframe = screen.getByTitle('Coordinate office');

        expect(iframe).toHaveAttribute('src', expect.stringContaining('18.4655%2C-66.1057'));

        mapsApiState.loadError = null;
        consoleError.mockRestore();
    });
});
