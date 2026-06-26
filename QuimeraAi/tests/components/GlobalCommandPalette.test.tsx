import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const paletteHandlersMock = vi.hoisted(() => ({
    close: vi.fn(),
    setQuery: vi.fn(),
    setSelectedIndex: vi.fn(),
    moveSelection: vi.fn(),
    executeCommand: vi.fn(),
}));

const paletteStateMock = vi.hoisted(() => ({
    current: {} as any,
}));

const createDefaultPaletteState = () => ({
    isOpen: true,
    close: paletteHandlersMock.close,
    query: '',
    setQuery: paletteHandlersMock.setQuery,
    selectedIndex: 0,
    setSelectedIndex: paletteHandlersMock.setSelectedIndex,
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
        {
            id: 'assistant:request',
            type: 'assistant_request',
            label: 'Ask Quimera: $t(project.detail, {"id":"1"})',
            labelKey: 'globalCommandPalette.askLabel',
            labelParams: { query: '$t(project.detail, {"id":"1"})' },
            description: 'Send this request to the Global Assistant Operating Layer.',
            descriptionKey: 'globalCommandPalette.askDescription',
            keywords: ['assistant'],
        },
    ],
    moveSelection: paletteHandlersMock.moveSelection,
    executeCommand: paletteHandlersMock.executeCommand,
});

vi.mock('../../hooks/useGlobalCommandPalette', () => ({
    useGlobalCommandPalette: () => paletteStateMock.current,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { defaultValue?: string }) => {
            if (key.includes('.bad.')) {
                throw new TypeError("Cannot read properties of null (reading '1')");
            }
            if (key === 'globalCommandPalette.askLabel' && (options as any)?.nest !== false) {
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
    beforeEach(() => {
        Object.values(paletteHandlersMock).forEach(mock => mock.mockReset());
        paletteStateMock.current = createDefaultPaletteState();
    });

    it('falls back when a command translation throws during render', async () => {
        const Component = (await import('../../components/global-assistant/GlobalCommandPalette')).default;

        render(<Component />);

        expect(screen.getByText('Fallback action')).toBeInTheDocument();
        expect(screen.getByText('Fallback description')).toBeInTheDocument();
        expect(screen.getByText('Ask Quimera: $t(project.detail, {"id":"1"})')).toBeInTheDocument();
    });

    it('skips invalid command types and coerces malformed command text during render', async () => {
        const Component = (await import('../../components/global-assistant/GlobalCommandPalette')).default;
        paletteStateMock.current = {
            ...createDefaultPaletteState(),
            items: [
                null,
                { id: 'unknown:item', type: 'unsupported', label: 'Unsupported command' },
                {
                    id: 'action:malformed',
                    type: 'action',
                    label: null,
                    labelKey: 'globalCommandPalette.commands.action.bad.label',
                    description: { text: 'Malformed description' },
                    descriptionKey: 'globalCommandPalette.commands.action.bad.description',
                    keywords: ['malformed'],
                },
            ],
        };

        render(<Component />);

        expect(screen.queryByText('Unsupported command')).not.toBeInTheDocument();
        expect(screen.getByText('Untitled command')).toBeInTheDocument();
    });
});
