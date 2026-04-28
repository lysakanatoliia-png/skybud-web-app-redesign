import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import de from './de_v1.json';
import en from './en_v1.json';
import ru from './ru_v1.json';
import uk from './uk_v1.json';

const resources = {
  de: { translation: de },
  en: { translation: en },
  ru: { translation: ru },
  uk: { translation: uk },
};

const SUPPORTED_LANGUAGES = ['en', 'de', 'uk', 'ru'];
const LANGUAGE_STORAGE_KEY = 'skybud_language';

const isSupportedLanguage = (lang: string | null | undefined): lang is string => {
  return typeof lang === 'string' && SUPPORTED_LANGUAGES.includes(lang);
};

const getStoredLanguage = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(storedLanguage)) {
      return storedLanguage;
    }
  } catch (error) {
    console.error('failed to read language from storage', error);
  }

  return null;
};

// get language from storage, start params or default to 'en'
const getInitialLanguage = (): string => {
  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    return storedLanguage;
  }

  if (typeof window === 'undefined') {
    return 'en';
  }

  // check start_param from Telegram WebApp (multiple ways to access it)
  const startParam = window.Telegram?.WebApp?.startParam || 
                     window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  
  if (startParam) {
    // start_param can be a string like "lang=en" or just "en"
    const langMatch = startParam.match(/lang=([a-z]{2})/i) || startParam.match(/^([a-z]{2})$/i);
    if (langMatch) {
      const lang = langMatch[1].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(lang)) {
        return lang;
      }
    }
  }
  
  // check URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const langFromUrl = urlParams.get('lang');
  if (langFromUrl) {
    const langLowercase = langFromUrl.toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(langLowercase)) {
      return langLowercase;
    }
  }
  
  return 'en';
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
  });

i18n.on('languageChanged', (language) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isSupportedLanguage(language)) {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('failed to save language to storage', error);
  }
});

export default i18n;
