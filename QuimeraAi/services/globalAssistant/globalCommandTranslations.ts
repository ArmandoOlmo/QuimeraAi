export type CommandTranslationParams = Record<string, string | number | boolean | null | undefined>;

type TranslateFunction = (key: string, options?: Record<string, unknown>) => unknown;

const reservedTranslationParamKeys = new Set(['defaultValue', 'interpolation', 'nest']);
const i18nextNestingPrefixPattern = /\$t\(/g;

export const coerceCommandText = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return fallback;
};

const maskI18nextNestingSyntax = (
    value: string,
    masks: Array<[string, string]>,
): string => value.replace(i18nextNestingPrefixPattern, match => {
    const token = `__quimera_command_i18n_nest_${masks.length}__`;
    masks.push([token, match]);
    return token;
});

const restoreI18nextNestingSyntax = (
    value: string,
    masks: Array<[string, string]>,
): string => masks.reduce(
    (current, [token, original]) => current.split(token).join(original),
    value,
);

const maskCommandTranslationParams = (
    params: CommandTranslationParams,
    masks: Array<[string, string]>,
): CommandTranslationParams => Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
        key,
        typeof value === 'string' ? maskI18nextNestingSyntax(value, masks) : value,
    ]),
) as CommandTranslationParams;

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
    const safeKey = coerceCommandText(key).trim();
    const safeFallback = coerceCommandText(fallback);
    if (!safeKey) return safeFallback;
    const masks: Array<[string, string]> = [];
    try {
        const safeParams = maskCommandTranslationParams(sanitizeCommandTranslationParams(params), masks);
        const maskedFallback = maskI18nextNestingSyntax(safeFallback, masks);
        const translated = translate(safeKey, {
            ...safeParams,
            defaultValue: maskedFallback,
            interpolation: { skipOnVariables: true },
            nest: false,
        });
        const resolved = typeof translated === 'string' ? translated : maskedFallback;
        return restoreI18nextNestingSyntax(resolved, masks);
    } catch {
        return safeFallback;
    }
};
