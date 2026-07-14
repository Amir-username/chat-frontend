// ---------------------------------------------------------------------------
// Token storage — thin abstraction over localStorage so the rest of the app
// doesn't care about the persistence mechanism.
//
// We store three things:
//   - access_token  : short-lived JWT, sent as `Authorization: Bearer ...`
//   - refresh_token : long-lived JWT, sent in the body of /auth/refresh
//   - expires_at    : epoch-ms when the access token expires (best-effort)
// ---------------------------------------------------------------------------

const ACCESS_KEY = "chat.access_token";
const REFRESH_KEY = "chat.refresh_token";
const EXPIRES_KEY = "chat.access_expires_at";

export const tokenStorage = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  get expiresAt(): number | null {
    const raw = localStorage.getItem(EXPIRES_KEY);
    return raw ? Number(raw) : null;
  },

  set(tokens: { access_token: string; refresh_token: string; expires_in: number }): void {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    localStorage.setItem(
      EXPIRES_KEY,
      String(Date.now() + tokens.expires_in * 1000),
    );
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  },

  /** True if we have an access token that hasn't (yet) expired. */
  hasValidAccess(): boolean {
    const t = this.access;
    const exp = this.expiresAt;
    if (!t || !exp) return false;
    // 10s skew window to avoid sending a token that's about to expire.
    return Date.now() < exp - 10_000;
  },
};
