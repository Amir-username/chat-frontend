// ---------------------------------------------------------------------------
// useAuthStore — the single source of truth for "who is the current user?".
//
// Zustand replaces the previous React Context implementation. Benefits:
//   - No <AuthProvider> wrapper needed — the store is a module-level singleton.
//   - Actions (login/register/logout/clearError) have STABLE identity by
//     construction, so there's no need for useCallback.
//   - Components subscribe to only the slices they care about via selectors:
//       const user = useAuthStore(s => s.user)
//     so e.g. ChatPage won't re-render when `error` changes.
//   - No useMemo on a context value object (which was the load-bearing
//     optimization in the Context version) — Zustand handles that internally.
//
// Lifecycle:
//   - On store creation: if we have a stored access token, call
//     /auth/me/profile to hydrate the user. If that 401s, the axios
//     interceptor tries to refresh transparently; if even that fails, the
//     user is logged out.
//   - login(payload)    -> POST /auth/login/json, store tokens, fetch profile
//   - register(payload) -> POST /auth/register (no auto-login; caller decides)
//   - logout()          -> POST /auth/logout, clear tokens, null user
//   - setProfile(p)     -> Update the cached profile (used by ProfilePage
//                          after a successful edit/image upload)
// ---------------------------------------------------------------------------

import { create } from "zustand";
import * as authApi from "../api/auth";
import { getMyProfile } from "../api/profile";
import { clearUserProfileCache } from "../hooks/useUserProfile";
import { tokenStorage } from "@/shared/api/tokens";
import type {
  LoginPayload,
  ProfileResponse,
  RegisterPayload,
  UserResponse,
} from "@/shared/types";
import { useRoomsStore } from "@/store/roomsStore";

interface AuthState {
  /** Cached current-user profile. We hydrate from /auth/me/profile (not
   *  /auth/me) because it returns name/bio/profile_image in addition to
   *  the standard UserOut fields — so the whole app has access. */
  user: ProfileResponse | null;
  /** True until the initial profile check finishes. Use this to gate the router. */
  loading: boolean;
  /** Error from the last login/register attempt (cleared on success). */
  error: string | null;

  // --- actions ---
  /** Validate stored tokens on app startup. Call once. */
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<UserResponse>;
  logout: () => Promise<void>;
  /** Replace the cached profile (e.g. after editing name/bio or uploading
   *  a new profile image). */
  setProfile: (profile: ProfileResponse) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  hydrate: async () => {
    if (!tokenStorage.access) {
      set({ loading: false });
      return;
    }
    try {
      const profile = await getMyProfile();
      set({ user: profile, loading: false });
    } catch {
      // Interceptor already cleared tokens + redirected if refresh failed.
      set({ user: null, loading: false });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ error: null });
    try {
      const tokens = await authApi.login(payload);
      tokenStorage.set(tokens);
      const profile = await getMyProfile();
      set({ user: profile });
    } catch (err) {
      const msg = extractErrorMessage(err) ?? "Login failed";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ error: null });
    try {
      // Registration returns the user profile but NOT tokens — caller must
      // login afterwards. We surface the created user so the UI can show
      // a "registration successful" message.
      return await authApi.register(payload);
    } catch (err) {
      const msg = extractErrorMessage(err) ?? "Registration failed";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.refresh;
    try {
      await authApi.logout(refreshToken ? { refresh_token: refreshToken } : {});
    } catch {
      // Even if the server call fails (token already revoked, network down,
      // etc.) we still want to clear local state so the user is logged out.
    } finally {
      tokenStorage.clear();
      set({ user: null });
      // Clear persisted room navigation so the next user doesn't inherit
      // the previous user's joined rooms / active room.
      useRoomsStore.getState().resetRooms();
      // Clear the cached public-profile lookup so the next user doesn't see
      // the previous user's fetched profile images / bios in chat.
      clearUserProfileCache();
    }
  },

  clearError: () => set({ error: null }),

  setProfile: (profile) => set({ user: profile }),
}));

// Kick off the initial /me hydration immediately (no useEffect needed).
// The store is a module-level singleton, so this runs exactly once.
void useAuthStore.getState().hydrate();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull a human-readable message out of an axios error response. */
function extractErrorMessage(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "response" in err) {
    const r = (err as { response?: { data?: { detail?: string } } }).response;
    if (r?.data?.detail) return r.data.detail;
  }
  if (err instanceof Error) return err.message;
  return null;
}
