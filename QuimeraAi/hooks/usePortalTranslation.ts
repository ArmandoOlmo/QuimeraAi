/**
 * Portal Translation Hook
 * Custom hook for managing translations in white-label portals
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/tenant/TenantContext';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'es' | 'en' | 'pt' | 'fr';

interface TranslationData {
  [key: string]: any;
}

interface UsePortalTranslationReturn {
  t: (key: string, params?: Record<string, any>) => string;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  availableLanguages: LanguageOption[];
  isLoading: boolean;
}

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

const STORAGE_KEY = 'portal_language_preference';

// ============================================================================
// TRANSLATION CACHE
// ============================================================================

const translationCache: Map<string, TranslationData> = new Map();

/**
 * Load translation file for a specific language
 */
async function loadTranslations(
  language: SupportedLanguage
): Promise<TranslationData> {
  // Check cache first
  const cacheKey = `portal_${language}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    // Dynamically import translation file
    const translations = await import(`@/locales/${language}/portal.json`);

    // Cache the translations
    translationCache.set(cacheKey, translations.default || translations);

    return translations.default || translations;
  } catch (error) {
    console.error(`Failed to load translations for ${language}:`, error);

    // Fallback to Spanish if loading fails
    if (language !== 'es') {
      return loadTranslations('es');
    }

    return {};
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Replace placeholders in translation string
 */
function interpolate(
  template: string,
  params: Record<string, any> = {}
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Get user's preferred language from storage or browser
 */
function getDefaultLanguage(): SupportedLanguage {
  // 1. Check localStorage
  const storedLang = localStorage.getItem(STORAGE_KEY);
  if (
    storedLang &&
    SUPPORTED_LANGUAGES.some((lang) => lang.code === storedLang)
  ) {
    return storedLang as SupportedLanguage;
  }

  // 2. Check browser language
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.some((lang) => lang.code === browserLang)) {
    return browserLang as SupportedLanguage;
  }

  // 3. Default to Spanish
  return 'es';
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Use Portal Translation Hook
 * Provides translation functionality for portal components
 */
export function usePortalTranslation(): UsePortalTranslationReturn {
  const { currentTenant } = useTenant();

  // Get initial language from tenant settings or user preference
  const getInitialLanguage = (): SupportedLanguage => {
    if (currentTenant?.settings?.portalLanguage) {
      return currentTenant.settings.portalLanguage as SupportedLanguage;
    }
    return getDefaultLanguage();
  };

  const [language, setLanguageState] = useState<SupportedLanguage>(
    getInitialLanguage()
  );
  const [translations, setTranslations] = useState<TranslationData>({});
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // LOAD TRANSLATIONS
  // ============================================================================

  useEffect(() => {
    loadTranslations(language).then((data) => {
      setTranslations(data);
      setIsLoading(false);
    });
  }, [language]);

  // ============================================================================
  // UPDATE LANGUAGE FROM TENANT SETTINGS
  // ============================================================================

  useEffect(() => {
    if (currentTenant?.settings?.portalLanguage) {
      const tenantLang = currentTenant.settings
        .portalLanguage as SupportedLanguage;
      if (tenantLang !== language) {
        setLanguageState(tenantLang);
      }
    }
  }, [currentTenant?.settings?.portalLanguage]);

  // ============================================================================
  // TRANSLATION FUNCTION
  // ============================================================================

  const t = useCallback(
    (key: string, params?: Record<string, any>): string => {
      const value = getNestedValue(translations, key);

      if (!value) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }

      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string: ${key}`);
        return key;
      }

      return params ? interpolate(value, params) : value;
    },
    [translations]
  );

  // ============================================================================
  // SET LANGUAGE
  // ============================================================================

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    t,
    language,
    setLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
    isLoading,
  };
}

// ============================================================================
// LANGUAGE SELECTOR COMPONENT HELPER
// ============================================================================

/**
 * Get language option by code
 */
export function getLanguageOption(
  code: SupportedLanguage
): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Format language name for display
 */
export function formatLanguageName(
  code: SupportedLanguage,
  displayType: 'native' | 'english' | 'both' = 'native'
): string {
  const option = getLanguageOption(code);
  if (!option) return code;

  switch (displayType) {
    case 'native':
      return option.nativeName;
    case 'english':
      return option.name;
    case 'both':
      return `${option.nativeName} (${option.name})`;
    default:
      return option.nativeName;
  }
}
