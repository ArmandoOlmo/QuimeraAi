import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    coerceCommandText,
    sanitizeCommandTranslationParams,
    translateCommandTextSafe,
} from '../../services/globalAssistant/globalCommandTranslations';

describe('globalCommandTranslations', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('ignores malformed translation param entries before rendering commands', () => {
        const originalEntries = Object.entries;
        const params = { __malformedEntries: true, query: '$t(project.detail, {"id":"1"})' } as any;
        const entriesSpy = vi.spyOn(Object, 'entries').mockImplementation((value: object) => {
            if ((value as any)?.__malformedEntries) {
                return [
                    null as any,
                    ['query', params.query],
                    ['nest', true],
                    ['interpolation', { escapeValue: false }],
                    ['count', 2],
                    ['metadata', { unsafe: true }],
                ];
            }

            return originalEntries(value);
        });

        const sanitized = sanitizeCommandTranslationParams(params);
        entriesSpy.mockRestore();

        expect(sanitized).toEqual({
            query: '$t(project.detail, {"id":"1"})',
            count: 2,
        });
    });

    it('coerces runtime command text values before translation fallback rendering', () => {
        expect(coerceCommandText(42)).toBe('42');
        expect(coerceCommandText(false)).toBe('false');
        expect(coerceCommandText(null, 'Fallback')).toBe('Fallback');
        expect(translateCommandTextSafe(
            vi.fn(() => ({ unsafe: true })),
            'globalCommandPalette.bad',
            null as any,
        )).toBe('');
    });

    it('falls back when i18n cannot translate a command string', () => {
        const translate = vi.fn(() => {
            throw new TypeError("Cannot read properties of null (reading '1')");
        });

        expect(translateCommandTextSafe(
            translate,
            'globalCommandPalette.commands.action.bad.label',
            'Fallback action',
            { query: '$t(project.detail, {"id":"1"})' },
        )).toBe('Fallback action');
    });

    it('masks i18next nesting syntax in params while preserving translated output', () => {
        const translate = vi.fn((_key: string, options?: Record<string, unknown>) => {
            expect(options?.query).not.toContain('$t(');
            return `Preguntar: ${options?.query}`;
        });

        expect(translateCommandTextSafe(
            translate,
            'globalCommandPalette.askLabel',
            'Ask Quimera: $t(project.detail, {"id":"1"})',
            { query: '$t(project.detail, {"id":"1"})' },
        )).toBe('Preguntar: $t(project.detail, {"id":"1"})');
    });
});
