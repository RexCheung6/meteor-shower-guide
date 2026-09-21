import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./locales/zh";
import en from "./locales/en";
import { getSavedLocale } from "../lib/locale";

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en }
  },
  lng: getSavedLocale(),
  fallbackLng: "zh",
  interpolation: { escapeValue: false }
});

export default i18n;
