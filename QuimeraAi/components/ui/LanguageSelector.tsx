import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'minimal' | 'sidebar' | 'button';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'dropdown'
}) => {
  const { i18n, t } = useTranslation();
  const { languages: allLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter only enabled languages
  const languages = allLanguages.filter(lang => lang.enabled).map(lang => ({
    ...lang,
    shortName: lang.code.toUpperCase()
  }));

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0] || { code: 'es', name: 'Español', flag: '🇪🇸', shortName: 'ES' };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  if (variant === 'sidebar') {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((lang) => {
            const isActive = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={[
                  'h-9 rounded-lg border text-xs font-bold transition-colors',
                  'flex items-center justify-center gap-2',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/30'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground',
                ].join(' ')}
                aria-label={`Switch to ${lang.name}`}
                aria-pressed={isActive}
              >
                <span>{lang.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'minimal') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center text-sm font-medium transition-all ${i18n.language === lang.code
                ? 'text-editor-accent opacity-100'
                : 'text-gray-400 hover:text-white opacity-70 hover:opacity-100'
              }`}
            aria-label={`Switch to ${lang.name}`}
          >
            <span className="mr-1.5">{lang.flag}</span>
            {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 h-9 px-3 rounded-xl
          bg-secondary/50 hover:bg-secondary/80 
          border border-border/40 hover:border-border/60
          text-foreground transition-all duration-200
          ${isOpen ? 'bg-secondary/80 border-primary/40 shadow-md' : ''}
        `}
        aria-label={t('language.selectLanguage')}
        aria-expanded={isOpen}
      >
        <Globe size={16} className="text-muted-foreground" />
        <span className="text-lg leading-none">{currentLanguage.flag}</span>
        <span className="text-sm font-semibold hidden sm:inline">{currentLanguage.shortName}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-border/50 bg-secondary/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('language.selectLanguage')}
              </p>
            </div>

            {/* Options */}
            <div className="py-1.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 
                    transition-all duration-150
                    ${i18n.language === lang.code
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-secondary/60'
                    }
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-semibold text-sm">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">{lang.shortName}</span>
                  </div>
                  {i18n.language === lang.code && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;

