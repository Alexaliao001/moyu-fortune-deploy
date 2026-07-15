import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from '../locales/zh.json';
import en from '../locales/en.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    
    detection: {
      // Order of language detection
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      // Keys to look for
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'moyu-language',
      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;

// Helper function to change language
export const changeLanguage = (lang: 'zh' | 'en') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('moyu-language', lang);
  // Update HTML lang attribute
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
};

// Get current language
export const getCurrentLanguage = (): 'zh' | 'en' => {
  const lang = i18n.language;
  return lang.startsWith('zh') ? 'zh' : 'en';
};
