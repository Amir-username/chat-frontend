// ---------------------------------------------------------------------------
// useUserProfile — fetch and cache any user's public profile by ID.
//
// Why this exists: the chat WebSocket broadcasts messages with only `user_id`
// and `name` — no `profile_image`. To render sender avatars in the chat we
// need to look up each sender's profile via GET /auth/users/{id}/profile.
// Calling that endpoint once per message would be wasteful, so this hook
// caches every fetched profile in a module-level Map that survives across
// component unmount/remount and across re-renders.
//
// Usage:
//   const { profile, loading, error } = useUserProfile(userId);
//
// The first call for a given userId triggers a fetch. Subsequent calls with
// the same userId (from anywhere in the app) return the cached profile
// synchronously. In-flight requests are deduped so a burst of messages from
// the same new user results in exactly one network request.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getUserProfile } from "../api/profile";
import type { ProfileResponse, UserId } from "@/shared/types";

// Module-level cache. Keyed by stringified userId (the backend uses int PKs
// but JWT `sub` is a string, so normalize to string for safe lookup).
const cache = new Map<string, ProfileResponse>();

// Tracks in-flight requests so we don't double-fetch the same user while the
// first request is still pending. The promise is shared across all callers.
const inflight = new Map<string, Promise<ProfileResponse>>();

function fetchProfile(userId: UserId): Promise<ProfileResponse> {
  const key = String(userId);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = getUserProfile(userId)
    .then((profile) => {
      cache.set(key, profile);
      inflight.delete(key);
      return profile;
    })
    .catch((err) => {
      // Don't cache failures — let the next caller retry.
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, p);
  return p;
}

interface UseUserProfileResult {
  profile: ProfileResponse | null;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(userId: UserId | null | undefined): UseUserProfileResult {
  const [state, setState] = useState<UseUserProfileResult>(() => {
    if (userId == null) return { profile: null, loading: false, error: null };
    const cached = cache.get(String(userId));
    return {
      profile: cached ?? null,
      loading: cached == null,
      error: null,
    };
  });

  useEffect(() => {
    if (userId == null) {
      setState({ profile: null, loading: false, error: null });
      return;
    }

    const key = String(userId);
    const cached = cache.get(key);
    if (cached) {
      setState({ profile: cached, loading: false, error: null });
      return;
    }

    // Not cached — mark loading and kick off the fetch.
    setState({ profile: null, loading: true, error: null });
    let cancelled = false;
    fetchProfile(userId)
      .then((profile) => {
        if (!cancelled) setState({ profile, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "response" in err
                ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Failed to load profile"
                : "Failed to load profile";
          setState({ profile: null, loading: false, error: msg });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

/** Clear the cache — useful on logout so stale profiles don't leak between
 *  sessions. The auth store calls this in its logout action. */
export function clearUserProfileCache(): void {
  cache.clear();
  inflight.clear();
}
