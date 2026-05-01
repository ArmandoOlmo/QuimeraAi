export const sanitizeI18nObject = (obj: any, preferredLanguage: string = 'en'): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeI18nObject(item, preferredLanguage));
  }
  
  if (typeof obj === 'object') {
    // Check if it's an i18n object (has 'en' and/or 'es' keys and values are strings)
    const keys = Object.keys(obj);
    const hasI18nKeys = keys.includes('en') || keys.includes('es');
    const hasOnlyStringValues = Object.values(obj).every(v => typeof v === 'string' || v === '');
    if (hasI18nKeys && keys.length <= 3 && hasOnlyStringValues) {
      return obj[preferredLanguage] || obj.es || obj.en || Object.values(obj)[0] || '';
    }
    
    // Otherwise recurse
    const result: any = {};
    for (const key in obj) {
      result[key] = sanitizeI18nObject(obj[key], preferredLanguage);
    }
    return result;
  }
  
  return obj;
};
