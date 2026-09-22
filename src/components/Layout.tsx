import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout } from "../auth";
import { pathWithLocale, setAppLocale, type Locale } from "../lib/locale";
import { maybeNotifyUpcomingShower } from "../lib/notifications";
import { useEffect, useState } from "react";

export default function Layout() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const current: Locale = locale === "en" ? "en" : "zh";
  const other: Locale = current === "zh" ? "en" : "zh";
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    maybeNotifyUpcomingShower();
  }, []);

  const navItems = [
    { to: `/${current}`, label: t("common.home"), icon: "⌂", end: true },
    { to: `/${current}/map`, label: t("common.visibilityMap"), icon: "✦", end: false },
    { to: `/${current}/weather`, label: t("common.weather"), icon: "☁", end: false },
    { to: `/${current}/tips`, label: t("common.tips"), icon: "✧", end: false }
  ];
  const utilityItems = [
    { to: `/${current}/favorites`, label: t("common.favorites"), icon: "★", end: false },
    { to: `/${current}/compare`, label: t("common.compare"), icon: "⇄", end: false },
    { to: `/${current}/log`, label: t("common.log"), icon: "☷", end: false },
    { to: `/${current}/observe`, label: t("observationMode.open"), icon: "◉", end: false }
  ];

  useEffect(() => setMoreOpen(false), [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  const moreMenu = (
    <div className={`more-menu ${moreOpen ? "open" : ""}`}>
      <button type="button" className="more-menu-trigger nav-link" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>
        <span className="nav-icon" aria-hidden="true">⋯</span><span>{t("common.more")}</span>
      </button>
      {moreOpen && (
        <div className="more-panel" role="menu">
          <p className="more-panel-title">{t("common.tools")}</p>
          {utilityItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="more-panel-link" onClick={() => setMoreOpen(false)}>
              <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  const switchLocale = () => {
    setAppLocale(other);
    navigate(pathWithLocale(location.pathname, other));
  };

  const handleLogout = () => {
    logout();
    navigate(`/${current}/login`);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to={`/${current}`} className="brand">
          <span className="brand-icon" aria-hidden="true">
            ☄️
          </span>
          <span className="brand-name">{t("common.appName")}</span>
        </Link>
        <nav className="main-nav" aria-label="main">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {moreMenu}
        </nav>
        <div className="header-actions">
          <button type="button" className="lang-toggle" onClick={switchLocale}>
            {other === "zh" ? "中文" : "EN"}
          </button>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            {t("common.logout")}
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="mobile">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {moreMenu}
      </nav>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          {t("common.appName")} · {t("common.tagline")}
        </p>
        <p className="footer-data">
          IMO 2026 Calendar · Open-Meteo · NASA GIBS · astronomy-engine
        </p>
      </footer>
    </div>
  );
}
