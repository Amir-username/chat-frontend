// ---------------------------------------------------------------------------
// Auth domain types — request payloads and token responses.
//
// These mirror the Pydantic schemas in:
//   - fast-auth/src/fast_auth/strategies/jwt.py (LoginIn, RefreshIn, TokenOut)
//   - chat-service/app/auth_routes.py (RegisterRequest)
// ---------------------------------------------------------------------------

import type { UserId } from "./user";

/**
 * Auth token pair returned by `/auth/login/json`, `/auth/login`, and
 * `/auth/refresh`. Mirrors fast-auth's `TokenOut` Pydantic model.
 */
export interface TokenOut {
  access_token: string;
  refresh_token: string;
  token_type: string; // always "bearer"
  /** Seconds until the access token expires. Useful for scheduling a
   *  pre-emptive refresh. */
  expires_in: number;
}

/**
 * Registration request body for the chat-service's custom `/auth/register`
 * endpoint. Differs from fast-auth's built-in `RegisterIn` by including
 * `name` (the display name stored on the extended User model).
 */
export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

/** JSON login request body for `/auth/login/json`. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Refresh request body for `/auth/refresh`. The refresh token is required
 *  in the body (the backend also accepts a cookie, but the frontend always
 *  sends it explicitly via localStorage). */
export interface RefreshPayload {
  refresh_token: string;
}

/** Logout request body for `/auth/logout`. The refresh token is optional —
 *  if present, the backend revokes it too (not just the access token). */
export interface LogoutPayload {
  refresh_token?: string;
}

/**
 * Decoded JWT access-token claims.
 *
 * Included for completeness / future use (e.g. inspecting roles client-side
 * without a round-trip to `/auth/me`). The `sub` claim is the user ID encoded
 * as a string.
 */
export interface AccessTokenClaims {
  sub: string;
  iat: number;
  exp: number;
  type: "access";
  jti: string;
  roles?: string[];
  email?: string;
  iss?: string;
  aud?: string;
}

/** Type alias for the JWT `sub` claim — same union as UserId. */
export type Subject = UserId;
