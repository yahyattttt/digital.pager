import { useState, useEffect, createContext, useContext } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  lang: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  t: (ar: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  isRTL: true,
  toggleLanguage: () => {},
  t: (ar: string) => ar,
});

export function useLanguageProvider() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("dp-lang");
    return (saved === "en" ? "en" : "ar") as Language;
  });

  const isRTL = lang === "ar";

  function toggleLanguage() {
    setLang((prev) => (prev === "ar" ? "en" : "ar"));
  }

  function t(ar: string, en: string) {
    return lang === "ar" ? ar : en;
  }

  useEffect(() => {
    localStorage.setItem("dp-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [lang, isRTL]);

  return { lang, isRTL, toggleLanguage, t };
}

export { LanguageContext };

export function useLanguage() {
  return useContext(LanguageContext);
}
