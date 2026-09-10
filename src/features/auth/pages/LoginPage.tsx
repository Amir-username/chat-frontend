import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/features/auth";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/private-chat", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center p-4 bg-bg-0">
      <div className="auth-card">
        <div className="flex items-center justify-between">
          <h1>{t("auth.login.title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="subtitle">{t("auth.login.subtitle")}</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">{t("auth.login.emailLabel")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.emailPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t("auth.login.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.passwordPlaceholder")}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || !email || !password}
          >
            {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <div className="switch-link">
          {t("auth.login.noAccount")}{" "}
          <Link to="/register">{t("auth.login.createOne")}</Link>
        </div>
      </div>
    </div>
  );
}
