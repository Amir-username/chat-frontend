// ---------------------------------------------------------------------------
// User domain types.
//
// Several shapes exist because the chat-service backend exposes user data via
// different endpoints with different fields:
//
//   - UserResponse     : POST /auth/register (includes name + bio + image)
//   - UserOut          : GET /auth/me (fast-auth's standard shape — no name)
//   - ProfileResponse  : GET /auth/me/profile, GET /auth/users/{id}/profile
//                        (the full superset — used for the profile page)
// ---------------------------------------------------------------------------

/**
 * POST /auth/register response.
 *
 * The chat-service overrides fast-auth's built-in `/auth/register` to capture
 * the user's display name and optional bio, so this response includes those
 * fields — which the standard `UserOut` does not.
 */
export interface UserResponse {
  id: number | string;
  email: string;
  name: string;
  bio: string | null;
  profile_image: string | null;
  is_active: boolean;
  is_verified: boolean;
}

/**
 * The standard fast-auth user shape, returned by `/auth/me` and the admin
 * user-management endpoints.
 *
 * Note: no `name`/`bio`/`profile_image` — those live only on the
 * chat-service's extended `User` model and surface via `UserResponse` /
 * `ProfileResponse`.
 */
export interface UserOut {
  id: number | string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
}

/**
 * Full public profile of a user — returned by `/auth/me/profile` and
 * `/auth/users/{id}/profile`.
 *
 * This is a superset of `UserOut`: it adds `name`, `bio`, and
 * `profile_image`. The auth store hydrates from `/auth/me/profile` so the
 * whole app has access to these fields without an extra fetch.
 */
export interface ProfileResponse {
  id: number | string;
  email: string;
  name: string;
  bio: string | null;
  /** Relative URL path (e.g. `/uploads/profile_images/1_abc.jpg`) or null. */
  profile_image: string | null;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
}

/** Convenience alias: a user's ID as represented in JWT `sub` claims and
 *  most API responses. The backend uses int PKs but the JWT encodes them
 *  as strings, so callers must handle both. */
export type UserId = number | string;
