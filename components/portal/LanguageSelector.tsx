/**
 * Language Selector Component
 * Dropdown selector for changing portal language
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import {
  usePortalTranslation,
  SupportedLanguage,
  formatLanguageName,
} from '@/hooks/usePortalTranslation';

// ============================================================================
// TYPES
// ============================================================================

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'minimal';
  showFlag?: boolean;
  showLanguageName?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LanguageSelector({
  variant = 'default',
  showFlag = true,
  showLanguageName = true,
  align = 'right',
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, t } =
    usePortalTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = availableLanguages.find(
    (lang) => lang.code === language
  );

  // ============================================================================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  // ============================================================================
  // RENDER VARIANTS
  // ============================================================================

  const renderTrigger = () => {
    switch (variant) {
      case 'compact':
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Select language"
          >
            {showFlag && (
              <span className="text-xl">{currentLanguage?.flag}</span>
            )}
            {showLanguageName && (
              <span className="text-sm font-medium text-gray-700">
                {currentLanguage?.code.toUpperCase()}
              </span>
            )}
          </button>
        );

      case 'minimal':
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Select language"
          >
            <Globe className="h-5 w-5 text-gray-600" />
          </button>
        );

      default:
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showFlag && (
              <span className="text-xl">{currentLanguage?.flag}</span>
            )}
            {showLanguageName && (
              <span className="text-sm font-medium text-gray-700">
                {formatLanguageName(language, 'native')}
              </span>
            )}
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        );
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {renderTrigger()}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              {t('settings.language.label')}
            </div>

            {availableLanguages.map((lang) => {
              const isSelected = lang.code === language;

              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {/* Flag */}
                  <span className="text-xl">{lang.flag}</span>

                  {/* Language Name */}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{lang.nativeName}</div>
                    <div className="text-xs text-gray-500">{lang.name}</div>
                  </div>

                  {/* Check Mark */}
                  {isSelected && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LANGUAGE BADGE COMPONENT
// ============================================================================

interface LanguageBadgeProps {
  language: SupportedLanguage;
  showFlag?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LanguageBadge({
  language,
  showFlag = true,
  size = 'md',
  className = '',
}: LanguageBadgeProps) {
  const { availableLanguages } = usePortalTranslation();
  const lang = availableLanguages.find((l) => l.code === language);

  if (!lang) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full font-medium ${sizeClasses[size]} ${className}`}
    >
      {showFlag && <span>{lang.flag}</span>}
      <span>{lang.nativeName}</span>
    </div>
  );
}

// ============================================================================
// LANGUAGE SWITCHER (SIMPLE TABS)
// ============================================================================

interface LanguageSwitcherProps {
  className?: string;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export function LanguageSwitcher({
  className = '',
  onLanguageChange,
}: LanguageSwitcherProps) {
  const { language, setLanguage, availableLanguages } =
    usePortalTranslation();

  const handleChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg ${className}`}
    >
      {availableLanguages.map((lang) => {
        const isSelected = lang.code === language;

        return (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              isSelected
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm">{lang.code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
