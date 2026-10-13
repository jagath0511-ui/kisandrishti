'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import en from '../locales/en.json';
import te from '../locales/te.json';
import hi from '../locales/hi.json';

export type SupportedLocale = 'en' | 'te' | 'hi';

export interface LanguageOption {
  code: SupportedLocale;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिंदी' },
];

const dictionaries: Record<SupportedLocale, Record<string, any>> = {
  en,
  te,
  hi,
};

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (keyPath: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'kisandrishti_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (saved && (saved === 'en' || saved === 'te' || saved === 'hi')) {
        setLocaleState(saved);
      }
    } catch {
      // Local storage may be restricted in some environments
    }
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Local storage write ignored if disabled
    }
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    const lookup = (dict: any): any => {
      let current = dict;
      for (const k of keys) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[k];
      }
      return current;
    };

    const value = lookup(dictionaries[locale]) ?? lookup(dictionaries.en);
    if (typeof value === 'string') return value;
    return keyPath;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: 'en' as SupportedLocale,
      setLocale: () => {},
      t: (keyPath: string) => {
        const keys = keyPath.split('.');
        let current: any = en;
        for (const k of keys) {
          if (!current || typeof current !== 'object') return keyPath;
          current = current[k];
        }
        return typeof current === 'string' ? current : keyPath;
      },
    };
  }
  return context;
}
