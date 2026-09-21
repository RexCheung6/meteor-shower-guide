import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { hasAccount, isLoggedIn, login, register } from "../auth";

type Mode = "register" | "login";

export default function LoginPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(() => (hasAccount() ? "login" : "register"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate(`/${locale}`, { replace: true });
  }, [locale, navigate]);

  if (isLoggedIn()) return <Navigate to={`/${locale}`} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 2 || username.trim().length > 32) {
      setError(t("login.invalidUsername"));
      return;
    }
    if (password.length < 6) {
      setError(t("login.shortPassword"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      navigate(`/${locale}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error && err.message === "account-exists" ? t("login.accountExists") : t("login.invalidCredentials"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">
          ☄️
        </div>
        <h1>{t("login.welcome")}</h1>
        <h2>{mode === "register" ? t("login.registerTitle") : t("login.loginTitle")}</h2>
        <p className="login-hint">{mode === "register" ? t("login.createHint") : ""}</p>
        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span>{t("login.username")}</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.usernamePlaceholder")}
              autoComplete="username"
              maxLength={32}
            />
          </label>
          <label className="field">
            <span>{t("login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={6}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t("common.loading") : mode === "register" ? t("login.submitRegister") : t("login.submitLogin")}
          </button>
        </form>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError(null);
          }}
        >
          {mode === "register" ? t("login.loginTitle") : t("login.registerTitle")}
        </button>
        <p className="login-note">{t("login.localNote")}</p>
      </div>
    </div>
  );
}
