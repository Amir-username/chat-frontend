// ---------------------------------------------------------------------------
// Profile API wrappers — endpoints under /auth/* for viewing and editing
// user profiles (name, bio, profile image).
//
// Backend source: app/profile_routes.py
// ---------------------------------------------------------------------------

import { api, apiPatch, apiGet } from "@/shared/api/client";
import type {
  ProfileResponse,
  UpdateProfilePayload,
  UserId,
} from "@/shared/types";

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
