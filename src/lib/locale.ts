import i18n from "../i18n";

export type Locale = "zh" | "en";

export const SUPPORTED_LOCALES: Locale[] = ["zh", "en"];

export function getSavedLocale(): Locale {
  try {
    return localStorage.getItem("mss.locale") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export function setSavedLocale(locale: Locale): void {
  try {
    localStorage.setItem("mss.locale", locale);
  } catch {
    // ignore
  }
}

export function setAppLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  setSavedLocale(locale);
}

/** Rewrite a path such as /zh/shower/per to /en/shower/per. */
export function pathWithLocale(path: string, locale: Locale): string {
  const rest = path.startsWith("/zh") ? path.slice(3) : path.startsWith("/en") ? path.slice(3) : path;
  return `/${locale}${rest === "" ? "/" : rest}`;
}

export function localeOfPath(path: string): Locale {
  if (path.startsWith("/en")) return "en";
  return "zh";
}

export function localizedName(name: { zh: string; en: string }, locale: Locale): string {
  return locale === "en" ? name.en : name.zh;
}
