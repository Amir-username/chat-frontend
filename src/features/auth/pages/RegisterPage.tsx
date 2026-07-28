import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/features/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function RegisterPage() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.register.passwordTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = bio.trim()
        ? { name, email, password, bio: bio.trim() }
        : { name, email, password };
      const user = await register(payload);
      setSuccess(t("auth.register.accountCreated", { email: user.email }));
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.register.registrationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center bg-bg-0">
      <div className="auth-card my-8">
        <div className="flex items-center justify-between">
          <h1>{t("auth.register.title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="subtitle">{t("auth.register.subtitle")}</p>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">{t("auth.register.nameLabel")}</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={1}
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.register.namePlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="email">{t("auth.register.emailLabel")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.register.emailPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t("auth.register.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.register.passwordPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="confirm">{t("auth.register.confirmLabel")}</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t("auth.register.confirmPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="bio">
              {t("auth.register.bioLabel")}{" "}
              <span className="optional">{t("auth.register.bioOptional")}</span>
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={2000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("auth.register.bioPlaceholder")}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || !name || !email || !password || !confirm}
          >
            {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>

        <div className="switch-link">
          {t("auth.register.hasAccount")}{" "}
          <Link to="/login">{t("auth.register.signIn")}</Link>
        </div>
      </div>
    </div>
  );
}
