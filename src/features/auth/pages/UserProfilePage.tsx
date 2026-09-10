// ---------------------------------------------------------------------------
// UserProfilePage — public, read-only view of any user's profile.
//
// Route: /users/:userId
//
// Fetches the user's profile via GET /auth/users/{user_id}/profile and shows
// their avatar, name, email, and bio. If the viewed user is the currently
// logged-in user, a link to the editable ProfilePage (/profile) is shown.
// ---------------------------------------------------------------------------

import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore, useUserProfile, Avatar } from "@/features/auth";
import { startPrivateChat } from "@/features/private-chat";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const numericId = userId ? Number(userId) : NaN;
  const isValidId = !Number.isNaN(numericId) && Number.isFinite(numericId);

  const { profile, loading, error } = useUserProfile(
    isValidId ? numericId : null,
  );

  const isSelf =
    currentUser != null &&
    profile != null &&
    String(currentUser.id) === String(profile.id);

  async function handleStartChat() {
    if (!profile) return;
    setChatError(null);
    setStartingChat(true);
    try {
      const chat = await startPrivateChat({ user_id: Number(profile.id) });
      navigate(`/private-chat?chat=${chat.id}`);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : t("profile.failedToStartChat"),
      );
    } finally {
      setStartingChat(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost px-3 py-1.5 text-sm"
          >
            {t("common.back")}
          </button>
          <h1 className="text-lg font-semibold">{t("profile.profile")}</h1>
          <div className="w-16 flex items-center justify-end gap-1">
            <LanguageSwitcher />
          </div>
        </div>

        {loading && (
          <div className="text-center text-fg-2 py-20">{t("profile.loadingProfile")}</div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-500 border border-red-500/30 rounded-md px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && profile && (
          <>
            {/* Avatar + name */}
            <div className="flex flex-col items-center mb-8">
              <Avatar
                userId={profile.id}
                name={profile.name}
                imageUrl={profile.profile_image}
                size={112}
              />
              <h2 className="mt-4 text-xl font-semibold text-fg-0">
                {profile.name}
              </h2>

              {isSelf ? (
                <Link
                  to="/profile"
                  className="btn btn-secondary mt-5 px-4 py-2 text-sm"
                >
                  {t("profile.editYourProfile")}
                </Link>
              ) : (
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="btn btn-primary mt-5 px-4 py-2 text-sm"
                >
                  {startingChat ? t("profile.startingChat") : t("profile.message")}
                </button>
              )}
              {chatError && (
                <p className="text-red-500 text-xs mt-2 max-w-xs text-center">
                  {chatError}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="bg-bg-1 border border-bg-3 rounded-lg p-6">
              <h3 className="text-xs text-fg-1 font-medium uppercase tracking-wide mb-3">
                {t("profile.bio")}
              </h3>
              {profile.bio ? (
                <p className="text-sm text-fg-0 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-fg-2 italic">
                  {isSelf
                    ? t("profile.noBioSelf")
                    : t("profile.noBioOther")}
                </p>
              )}
            </div>
          </>
        )}

        {!loading && !error && !profile && !isValidId && (
          <div className="bg-red-500/10 text-red-500 border border-red-500/30 rounded-md px-4 py-3 text-sm text-center">
            {t("profile.invalidUserId")}
          </div>
        )}
      </div>
    </div>
  );
}
