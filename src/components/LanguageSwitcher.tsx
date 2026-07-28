import { useTranslation } from "react-i18next";
import {
  LANGUAGE_LABELS,
  applyLanguageDirection,
  type Language,
} from "@/i18n";

const LANGUAGES: Language[] = ["en", "fa"];

export default function LanguageSwitcher({
  className = "",
}: {
  /** Extra Tailwind classes applied to the wrapper. */
  className?: string;
}) {
  const { i18n } = useTranslation();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value as Language;
    i18n.changeLanguage(lang);
    applyLanguageDirection(lang);
  }

  return (
    <select
      value={i18n.language as Language}
      onChange={handleChange}
      className={"btn btn-ghost text-xs cursor-pointer " + className}
      aria-label="Language"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </select>
  );
}
