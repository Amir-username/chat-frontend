// ---------------------------------------------------------------------------
// Profile API wrappers — endpoints under /auth/* for viewing and editing
// user profiles (name, bio, profile image) and searching users by name.
//
// Backend source: app/profile_routes.py
// ---------------------------------------------------------------------------

import type { AxiosRequestConfig } from "axios";
import { api, apiPatch, apiGet } from "@/shared/api/client";
import type {
  ProfileResponse,
  UpdateProfilePayload,
  UserId,
} from "@/shared/types";

/**
 * GET /auth/search?q=<query>&limit=<n> — case-insensitive partial match on
 * user name. Returns matching users' full public profiles.
 *
 * Pass an `AbortSignal` via the second argument so the caller can cancel
 * in-flight requests when a newer keystroke arrives (see `useUserSearch`).
 *
 * Backend validates: `q` 1–100 chars, `limit` 1–100 (default 20).
 */
export function searchUsers(
  query: string,
  opts: {
    limit?: number;
    signal?: AbortSignal;
  } = {},
): Promise<ProfileResponse[]> {
  const params = new URLSearchParams({ q: query });
  if (opts.limit != null) params.set("limit", String(opts.limit));
  const config: AxiosRequestConfig = {};
  if (opts.signal) config.signal = opts.signal;
  return apiGet<ProfileResponse[]>(`/auth/search?${params.toString()}`, config);
}

/** GET /auth/me/profile — the authenticated user's full profile. */
export function getMyProfile(): Promise<ProfileResponse> {
  return apiGet<ProfileResponse>("/auth/me/profile");
}

/** GET /auth/users/{user_id}/profile — any user's public profile. */
export function getUserProfile(userId: UserId): Promise<ProfileResponse> {
  return apiGet<ProfileResponse>(`/auth/users/${userId}/profile`);
}

/** PATCH /auth/me/profile — update name and/or bio.
 *  Returns the updated profile. */
export function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<ProfileResponse> {
  return apiPatch<ProfileResponse>("/auth/me/profile", payload);
}

/** POST /auth/me/profile-image — upload or replace the profile image.
 *
 * Sends multipart/form-data with a single `file` field. The backend accepts
 * jpg/jpeg/png/gif/webp up to 5 MB and returns the updated profile (with the
 * new `profile_image` URL).
 */
export async function uploadProfileImage(
  file: File,
): Promise<ProfileResponse> {
  const form = new FormData();
  form.append("file", file);
  const r = await api.post<ProfileResponse>(
    "/auth/me/profile-image",
    form,
    // Let the browser set the multipart boundary — don't force JSON here.
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return r.data;
}
