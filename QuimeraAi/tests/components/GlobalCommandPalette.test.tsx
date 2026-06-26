import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useGlobalCommandPalette', () => ({
    useGlobalCommandPalette: () => ({
        isOpen: true,
        close: vi.fn(),
        query: '',
        setQuery: vi.fn(),
        selectedIndex: 0,
        setSelectedIndex: vi.fn(),
        items: [
            {
                id: 'action:test',
                type: 'action',
                label: 'Fallback action',
                labelKey: 'globalCommandPalette.commands.action.bad.label',
                description: 'Fallback description',
                descriptionKey: 'globalCommandPalette.commands.action.bad.description',
                keywords: ['fallback'],
            },
        ],
        moveSelection: vi.fn(),
        executeCommand: vi.fn(),
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { defaultValue?: string }) => {
            if (key.includes('.bad.')) {
                throw new TypeError("Cannot read properties of null (reading '1')");
            }
            return options?.defaultValue || key;
        },
    }),
}));

vi.mock('../../components/ui/Modal', () => ({
    default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (
        isOpen ? <div>{children}</div> : null
    ),
}));

describe('GlobalCommandPalette', () => {
    it('falls back when a command translation throws during render', async () => {
        const Component = (await import('../../components/global-assistant/GlobalCommandPalette')).default;

        render(<Component />);

        expect(screen.getByText('Fallback action')).toBeInTheDocument();
        expect(screen.getByText('Fallback description')).toBeInTheDocument();
    });
});
