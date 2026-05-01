/**
 * i18n Content Resolution Utility
 * 
 * Resolves multilingual CMS content stored in Firestore.
 * Supports two formats:
 *   - Legacy (string):      "Título en español"
 *   - Multilingual (object): { es: "Título en español", en: "Title in English" }
 * 
 * Usage:
 *   const resolved = resolveI18nContent(section.data.title, i18n.language);
 *   // Returns the string for the current language, or falls back to 'es', then first available
 */

/**
 * Resolve a single field that might be a plain string or a { lang: string } map.
 */
export function resolveI18nField(
    value: string | Record<string, string> | undefined | null,
    language: string,
    fallbackLanguage: string = 'es'
): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        // Try exact match first, then fallback language, then first available
        return value[language] || value[fallbackLanguage] || Object.values(value)[0] || '';
    }
    return '';
}

/**
 * Known translatable text fields in Quimera suite section data.
 * These are the fields that should be resolved for multi-language content.
 */
const TRANSLATABLE_FIELDS = new Set([
    'title', 'subtitle', 'introText', 'differentiatorTitle', 'differentiatorText',
    'primaryButtonText', 'secondaryButtonText', 'flowText', 'footnote',
    'headline', 'subheadline', 'description', 'ctaText', 'ctaSubtitle',
    'badgeText', 'tagline', 'accentText', 'secondaryText', 'buttonText',
    'buttonUrl', 'searchPlaceholder', 'loginText', 'loginUrl', 'ctaUrl', 'copyrightText',
    // Fields from items and nested objects
    'name', 'question', 'answer', 'quote', 'author', 'role', 'company',
    'price', 'billingPeriod', 'linkText', 'frequency', 'text', 'href', 'buttonLink',
    'address', 'city', 'state', 'zipCode', 'country', 'phone', 'email'
]);

/**
 * Deep-resolve all translatable fields in a section data object.
 * Returns a new object with resolved string values for the given language.
 * Non-translatable fields are passed through unchanged.
 */
export function resolveI18nSectionData(
    data: Record<string, any> | undefined | null,
    language: string,
    fallbackLanguage: string = 'es'
): Record<string, any> {
    if (!data) return {};

    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        if (TRANSLATABLE_FIELDS.has(key) && value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value) && isI18nMap(value)) {
                resolved[key] = resolveI18nField(value, language, fallbackLanguage);
            } else {
                resolved[key] = value;
            }
        } else if (Array.isArray(value)) {
            // Resolve items inside arrays
            resolved[key] = value.map(item => {
                if (typeof item === 'object' && item !== null && !isI18nMap(item)) {
                    return resolveI18nSectionData(item, language, fallbackLanguage);
                }
                return item;
            });
        } else if (typeof value === 'object' && value !== null && !isI18nMap(value)) {
            // Deeply resolve nested objects (e.g. footer.contactInfo)
            resolved[key] = resolveI18nSectionData(value, language, fallbackLanguage);
        } else {
            resolved[key] = value;
        }
    }

    return resolved;
}

/**
 * Check if an object looks like an i18n language map (e.g., { es: "...", en: "..." })
 * vs. a regular nested object (like colors, which has properties like background, text, etc.)
 */
function isI18nMap(obj: Record<string, any>): boolean {
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    // An i18n map has 2-letter language codes as keys and string values
    return keys.every(k => k.length <= 5 && typeof obj[k] === 'string');
}

/**
 * Convert a plain string value into an i18n map with the given language.
 * Used when saving content from the editor.
 * 
 * Example: toI18nMap("Hello", "en") => { en: "Hello" }
 */
export function toI18nMap(value: string, language: string): Record<string, string> {
    return { [language]: value };
}

/**
 * Merge a new value into an existing i18n map (or create one).
 * Preserves existing translations for other languages.
 * 
 * Example: mergeI18nValue({ es: "Hola" }, "Hello", "en") => { es: "Hola", en: "Hello" }
 */
export function mergeI18nValue(
    existing: string | Record<string, string> | undefined | null,
    newValue: string,
    language: string
): Record<string, string> {
    if (!existing || typeof existing === 'string') {
        // If the existing value is a plain string, assume it's in the fallback language
        const result: Record<string, string> = {};
        if (typeof existing === 'string' && existing) {
            result['es'] = existing; // Assume existing string was in Spanish (default)
        }
        result[language] = newValue;
        return result;
    }
    return { ...existing, [language]: newValue };
}
