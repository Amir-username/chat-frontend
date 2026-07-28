import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fa from "./locales/fa.json";

/** Supported language codes. */
export type Language = "en" | "fa";

/** Human-readable labels for each language (in the language's own script). */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  fa: "فارسی",
};

/** Languages that require RTL layout. */
const RTL_LANGUAGES: Language[] = ["fa"];

/** Detect the saved language from localStorage, falling back to browser lang or "en". */
function detectLanguage(): Language {
  const stored = localStorage.getItem("chat.language");
  if (stored === "en" || stored === "fa") return stored;

  const browser = navigator.language.slice(0, 2);
  if (browser === "fa") return "fa";

  return "en";
}

/** Apply `dir` and `lang` attributes on <html> and store the preference. */
export function applyLanguageDirection(lang: Language) {
  const dir = (RTL_LANGUAGES as string[]).includes(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
  localStorage.setItem("chat.language", lang);
}

const detected = detectLanguage();
applyLanguageDirection(detected);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: detected,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
