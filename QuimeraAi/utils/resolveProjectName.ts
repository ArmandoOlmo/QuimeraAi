/**
 * resolveProjectName
 * 
 * Safely extracts a display string from a project name field.
 * Project names can be stored as:
 *  - A plain string: "My Project"
 *  - An i18n object: { en: "My Project", es: "Mi Proyecto" }
 * 
 * This helper prevents React crashes ("Objects are not valid as a React child")
 * and TypeError ("toLowerCase is not a function") when the name is an object.
 */
export function resolveProjectName(name: unknown, lang?: string): string {
    if (!name) return '';
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
        const obj = name as Record<string, string>;
        const preferred = lang?.startsWith('es') ? 'es' : 'en';
        return obj[preferred] || obj.es || obj.en || Object.values(obj)[0] || '';
    }
    return String(name);
}
