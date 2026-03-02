'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Statically import the JSON files to prevent Next.js build timeouts
import enTranslation from '../../public/locales/en/translation.json';
import esTranslation from '../../public/locales/es/translation.json';
import zhTranslation from '../../public/locales/zh/translation.json';

const resources = {
    en: { translation: enTranslation },
    es: { translation: esTranslation },
    zh: { translation: zhTranslation }
};

i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'es', 'zh'],
        resources,
        interpolation: { escapeValue: false },
    });

export default i18next;
