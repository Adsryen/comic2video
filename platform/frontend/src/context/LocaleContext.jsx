import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LocaleContext = createContext();
const STORAGE_KEY = 'platform_locale';

const detectInitialLocale = () => {
  if (typeof window === 'undefined') return 'zh';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh' || stored === 'en') {
    return stored;
  }

  const browserLanguage = (window.navigator.language || '').toLowerCase();
  if (browserLanguage.startsWith('en')) {
    return 'en';
  }

  return 'zh';
};

export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState(detectInitialLocale);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((current) => (current === 'zh' ? 'en' : 'zh')),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
};
