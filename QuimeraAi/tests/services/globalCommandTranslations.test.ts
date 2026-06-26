import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
});
