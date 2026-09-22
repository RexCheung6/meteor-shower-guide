import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ShowerDetailPage from "./pages/ShowerDetailPage";
import MapPage from "./pages/MapPage";
import WeatherPage from "./pages/WeatherPage";
import TipsPage from "./pages/TipsPage";
import NotFoundPage from "./pages/NotFoundPage";
import FavoritesPage from "./pages/FavoritesPage";
import ObservationModePage from "./pages/ObservationModePage";
import ComparePage from "./pages/ComparePage";
import { isLoggedIn } from "./auth";
import { getSavedLocale, SUPPORTED_LOCALES, type Locale } from "./lib/locale";
import { LocationProvider } from "./context/LocationContext";

function LocaleGate() {
  const { locale } = useParams();
  const { i18n } = useTranslation();
  const current: Locale = locale === "en" ? "en" : "zh";
  useEffect(() => {
    if (i18n.language !== current) void i18n.changeLanguage(current);
  }, [current, i18n]);
  if (!locale || !SUPPORTED_LOCALES.includes(locale as Locale)) return <Navigate to={`/${getSavedLocale()}`} replace />;
  if (!isLoggedIn()) return <Navigate to={`/${current}/login`} replace />;
  return <Layout />;
}

export default function App() {
  return (
    <LocationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${getSavedLocale()}`} replace />} />
          <Route path="/:locale/login" element={<LoginPage />} />
          <Route path="/:locale" element={<LocaleGate />}>
            <Route index element={<HomePage />} />
            <Route path="showers/:id" element={<ShowerDetailPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="weather" element={<WeatherPage />} />
            <Route path="weather/:place" element={<WeatherPage />} />
            <Route path="tips" element={<TipsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="observe" element={<ObservationModePage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<Navigate to={`/${getSavedLocale()}`} replace />} />
        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
}
