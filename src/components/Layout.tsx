import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout } from "../auth";
import { pathWithLocale, setAppLocale, type Locale } from "../lib/locale";

export default function Layout() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const current: Locale = locale === "en" ? "en" : "zh";
  const other: Locale = current === "zh" ? "en" : "zh";

  const navItems = [
    { to: `/${current}`, label: t("common.home"), icon: "⌂", end: true },
    { to: `/${current}/map`, label: t("common.visibilityMap"), icon: "✦", end: false },
    { to: `/${current}/weather`, label: t("common.weather"), icon: "☁", end: false },
    { to: `/${current}/tips`, label: t("common.tips"), icon: "✧", end: false },
    { to: `/${current}/favorites`, label: t("common.favorites"), icon: "★", end: false },
    { to: `/${current}/compare`, label: t("common.compare"), icon: "⇄", end: false }
  ];

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
