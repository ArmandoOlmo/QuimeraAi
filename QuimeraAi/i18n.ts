import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  es: {
    translation: translationES
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector) // Detecta el idioma del navegador
  .use(initReactI18next) // Integración con React
  .init({
    resources,
    fallbackLng: 'es', // Idioma por defecto
    lng: 'es', // Idioma inicial
    debug: false, // Cambia a true para debugging
    
    interpolation: {
      escapeValue: false // React ya escapa por seguridad
    },

    detection: {
      // Orden de detección del idioma
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'], // Guarda la preferencia en localStorage
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;

