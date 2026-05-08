export const sanitizeI18nObject = (obj: any, preferredLanguage: string = 'en', seen = new WeakSet(), depth: number = 0): any => {
  if (obj === null || obj === undefined) return obj;
  
  // Depth limit to prevent stack overflow
  if (depth > 50) return obj;

  if (Array.isArray(obj)) {
    // Prevent circular reference infinite loops for arrays
    if (seen.has(obj)) return undefined;
    seen.add(obj);
    return obj.map(item => sanitizeI18nObject(item, preferredLanguage, seen, depth + 1));
  }
  
  if (typeof obj === 'object') {
    // Skip DOM nodes, React Fibers, React Elements, etc.
    if (
        (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) ||
        obj.nodeType ||
        obj.nativeEvent ||
        obj.$$typeof // React element
    ) {
        return undefined;
    }
      
    // Prevent circular reference infinite loops for objects
    if (seen.has(obj)) {
        return undefined;
    }
    seen.add(obj);

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
      if (key.startsWith('__reactFiber') || key.startsWith('__reactProps')) continue;
      result[key] = sanitizeI18nObject(obj[key], preferredLanguage, seen, depth + 1);
    }
    return result;
  }
  
  return obj;
};
