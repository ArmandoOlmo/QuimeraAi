export type CommandTranslationParams = Record<string, string | number | boolean | null | undefined>;

type TranslateFunction = (key: string, options?: Record<string, unknown>) => unknown;

const reservedTranslationParamKeys = new Set(['defaultValue', 'interpolation', 'nest']);

export const sanitizeCommandTranslationParams = (
    params?: CommandTranslationParams | null,
): CommandTranslationParams => {
    if (!params || typeof params !== 'object') return {};

    let entries: [string, unknown][] = [];
    try {
        entries = Object.entries(params) as [string, unknown][];
    } catch {
        return {};
    }

    const safeParams: CommandTranslationParams = {};
    for (const entry of entries) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const key = typeof entry[0] === 'string' ? entry[0] : '';
        const value = entry[1];
        if (!key || reservedTranslationParamKeys.has(key)) continue;
        if (value == null) continue;
        if (
            typeof value === 'string'
            || typeof value === 'number'
            || typeof value === 'boolean'
        ) {
            safeParams[key] = value;
        }
    }

    return safeParams;
};

export const translateCommandTextSafe = (
    translate: TranslateFunction,
    key: string | undefined,
    fallback: string,
    params?: CommandTranslationParams | null,
): string => {
    if (!key) return fallback;
    try {
        const translated = translate(key, {
            ...sanitizeCommandTranslationParams(params),
            defaultValue: fallback,
            interpolation: { skipOnVariables: true },
            nest: false,
        });
        return typeof translated === 'string' ? translated : fallback;
    } catch {
        return fallback;
    }
};
