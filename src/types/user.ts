// ---------------------------------------------------------------------------
// User domain types.
//
// Two shapes exist because the chat-service backend has a *custom* register
// endpoint (that captures `name`) while fast-auth's built-in endpoints return
// the standard `UserOut` (which has no `name` field).
// ---------------------------------------------------------------------------

/**
 * POST /auth/register response.
 *
 * The chat-service overrides fast-auth's built-in `/auth/register` to capture
 * the user's display name, so this response includes `name` — which the
 * standard `UserOut` does not.
 */
export interface UserResponse {
  id: number | string;
  email: string;
  name: string;
  is_active: boolean;
  is_verified: boolean;
}

/**
 * The standard fast-auth user shape, returned by `/auth/me` and the admin
 * user-management endpoints.
 *
 * Note: no `name` field — that lives only on the chat-service's extended
 * `User` model and surfaces via `UserResponse`.
 */
export interface UserOut {
  id: number | string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
}

/** Convenience alias: a user's ID as represented in JWT `sub` claims and
 *  most API responses. The backend uses int PKs but the JWT encodes them
 *  as strings, so callers must handle both. */
export type UserId = number | string;
