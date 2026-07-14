// ---------------------------------------------------------------------------
// AuthContext — the single source of truth for "who is the current user?".
//
// Lifecycle:
//   - On mount: if we have a stored access token, call /auth/me to hydrate
//     the user. If that 401s, the axios interceptor will try to refresh
//     transparently; if even that fails, the user is logged out.
//   - login(payload)   -> POST /auth/login/json, store tokens, fetch /me
//   - register(payload) -> POST /auth/register (no auto-login; caller decides)
//   - logout()         -> POST /auth/logout, clear tokens, null user
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/api/auth";
import { tokenStorage } from "@/api/tokens";
import type { LoginPayload, RegisterPayload, UserOut, UserResponse } from "@/types";

interface AuthContextValue {
  user: UserOut | null;
  /** True until the initial /me check finishes. Use this to gate the router. */
  loading: boolean;
  /** Error from the last login/register attempt (cleared on success). */
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<UserResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Hydrate the current user from stored tokens on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStorage.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.getMe();
        if (!cancelled) setUser(me);
      } catch {
        // Interceptor already cleared tokens + redirected if refresh failed.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    try {
      const tokens = await authApi.login(payload);
      tokenStorage.set(tokens);
      const me = await authApi.getMe();
      setUser(me);
    } catch (err) {
      const msg = extractErrorMessage(err) ?? "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    try {
      // Registration returns the user profile but NOT tokens — caller must
      // login afterwards. We surface the created user so the UI can show
      // a "registration successful" message.
      return await authApi.register(payload);
    } catch (err) {
      const msg = extractErrorMessage(err) ?? "Registration failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.refresh;
    try {
      await authApi.logout(refreshToken ? { refresh_token: refreshToken } : {});
    } catch {
      // Even if the server call fails (token already revoked, network down,
      // etc.) we still want to clear local state so the user is logged out.
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, register, logout, clearError }),
    [user, loading, error, login, register, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

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
