import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'minimal';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '', 
  variant = 'dropdown' 
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

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
            className={`flex items-center text-sm font-medium transition-all ${
              i18n.language === lang.code
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
        className="flex items-center justify-center transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:opacity-70 group"
        aria-label={t('language.selectLanguage')}
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentLanguage.flag}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-editor-bg-secondary transition-colors ${
                  i18n.language === lang.code 
                    ? 'bg-editor-accent/20 text-editor-accent' 
                    : 'text-editor-text-primary'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {i18n.language === lang.code && (
                  <span className="ml-auto text-editor-accent">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

