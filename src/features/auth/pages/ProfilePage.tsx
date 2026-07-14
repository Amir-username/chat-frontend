import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { updateMyProfile, uploadProfileImage } from "@/features/auth";
import { resolveImageUrl } from "@/shared";
import { colorForUser, readableTextOn } from "@/features/chat/utils/colors";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const logout = useAuthStore((s) => s.logout);

  // Editable form state — seeded from the cached profile.
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Image upload state.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  if (!user) {
    // Shouldn't happen (route is protected) but guard anyway.
    navigate("/login", { replace: true });
    return null;
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("Name cannot be empty");
      return;
    }

    setSavingProfile(true);
    try {
      // Send both fields — the backend only updates the ones present, and we
      // want bio to be clearable (empty string → cleared).
      const updated = await updateMyProfile({
        name: trimmedName,
        bio: bio.trim() || null,
      });
      setProfile(updated);
      setProfileSuccess("Profile saved");
      setTimeout(() => setProfileSuccess(null), 2500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setUploading(true);
    try {
      const updated = await uploadProfileImage(file);
      setProfile(updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset the input so selecting the same file again re-triggers onChange.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Avatar color derived from user ID (same as chat messages).
  const avatarColor = colorForUser(user.id);
  const avatarText = readableTextOn(avatarColor);
  const imageUrl = resolveImageUrl(user.profile_image);
  const initial = (user.name?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/chat")}
            className="btn btn-ghost px-3 py-1.5 text-sm"
          >
            ← Back to chat
          </button>
          <h1 className="text-lg font-semibold">Your profile</h1>
          <button
            onClick={handleLogout}
            className="btn btn-ghost px-3 py-1.5 text-sm text-fg-1"
          >
            Sign out
          </button>
        </div>

        {/* Avatar + image upload */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={user.name}
                className="w-28 h-28 rounded-full object-cover border-2 border-bg-3"
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-semibold border-2 border-bg-3"
                style={{ background: avatarColor, color: avatarText }}
              >
                {initial}
              </div>
            )}

            {/* Upload button overlaid on the avatar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors disabled:opacity-60"
              title="Upload profile picture"
              aria-label="Upload profile picture"
            >
              {uploading ? (
                <span className="text-xs">…</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-fg-2 mt-3">
            JPG, PNG, GIF, or WebP — max 5 MB
          </p>
          {imageError && (
            <p className="text-red-500 text-xs mt-2">{imageError}</p>
          )}
        </div>

        {/* Edit profile form */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-bg-1 border border-bg-3 rounded-lg p-6"
        >
          {profileError && (
            <div className="bg-red-500/10 text-red-500 border border-red-500/30 rounded-md px-3 py-2.5 mb-4 text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-500/10 text-green-500 border border-green-500/30 rounded-md px-3 py-2.5 mb-4 text-sm">
              {profileSuccess}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="name"
              className="block mb-1.5 text-xs text-fg-1 font-medium uppercase tracking-wide"
            >
              Display name
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={1}
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              disabled={savingProfile}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="bio"
              className="block mb-1.5 text-xs text-fg-1 font-medium uppercase tracking-wide"
            >
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={2000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people a little about yourself…"
              className="w-full resize-none"
              disabled={savingProfile}
            />
            <p className="text-right text-xs text-fg-2 mt-1">
              {bio.length}/2000
            </p>
          </div>

          {/* Email is read-only — it's not editable via this endpoint */}
          <div className="mb-6">
            <label className="block mb-1.5 text-xs text-fg-1 font-medium uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full opacity-60 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={savingProfile || !name.trim()}
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
