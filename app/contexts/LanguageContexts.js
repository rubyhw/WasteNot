'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../config/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [mounted, setMounted] = useState(false);

  // Initialize language on mount (client-side only)
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && ['en', 'zh', 'ms'].includes(savedLang)) {
      setLanguage(savedLang);
    } else {
      // Default to English and save it
      localStorage.setItem('language', 'en');
    }
    setMounted(true);
  }, []);

  const switchLanguage = (lang) => {
    if (['en', 'zh', 'ms'].includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
      // Force a re-render by updating state
      setLanguage(lang);
    }
  };

  // Helper function to get text: t('hero.title')
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key; // Return key if translation missing
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return { language: 'en', switchLanguage: () => {}, t: (key) => key, mounted: false };
  }
  return context;
};