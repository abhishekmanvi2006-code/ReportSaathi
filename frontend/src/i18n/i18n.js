import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import knTranslation from './locales/kn.json';
import hiTranslation from './locales/hi.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  kn: {
    translation: knTranslation,
  },
  hi: {
    translation: hiTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'kn', 'hi'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'reportsaathi_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
