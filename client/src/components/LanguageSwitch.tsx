import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '@/lib/i18n';

export function LanguageSwitch() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<'zh' | 'en'>(getCurrentLanguage());

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium"
      title={currentLang === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      {currentLang === 'zh' ? 'EN' : '中'}
    </button>
  );
}
