// ---------------------------------------------------------------------------
// useUserSearch — debounced, abortable user search.
//
// Best-practice search hook that combines:
//   - **Debounce** (via useDebouncedValue) — only fires after the user stops
//     typing for `debounceMs` ms, so we don't spam the API on every keystroke.
//   - **AbortController** — when a new query supersedes an in-flight request,
//     the old request is aborted so its (now-stale) response can't overwrite
//     the newer one. This is the canonical fix for "results flicker / wrong
//     results shown" race conditions in search UIs.
//   - **State machine** — exposes `status: "idle" | "loading" | "success" |
//     "error"` so the UI can render the right thing per phase without
//     inferring from null/empty arrays.
//   - **Self-exclusion** — the current user is filtered out of results so
//     you can't search for / message yourself.
//
// Usage:
//   const { query, setQuery, results, status, error } = useUserSearch();
//   <input value={query} onChange={e => setQuery(e.target.value)} />
//   {status === "loading" && <Spinner />}
//   {status === "success" && results.map(u => <UserRow user={u} />)}
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { searchUsers } from "../api/profile";
import { useAuthStore } from "../store/authStore";
import { useDebouncedValue } from "@/shared";
import type { ProfileResponse } from "@/shared/types";

export type SearchStatus = "idle" | "loading" | "success" | "error";

// Minimum query length before we fire a request. The backend also enforces
// min_length=1, but skipping empty/whitespace queries client-side avoids a
// pointless network round-trip and lets us show a helpful empty state.
const MIN_QUERY_LENGTH = 1;
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;

interface UseUserSearchResult {
  /** The raw (non-debounced) query — bind this to the input value. */
  query: string;
  /** Update the query. Triggers a debounced search. */
  setQuery: (q: string) => void;
  /** Search results (excluding the current user). Empty array if no matches. */
  results: ProfileResponse[];
  /** Current search phase. */
  status: SearchStatus;
  /** Error message if status === "error". */
  error: string | null;
  /** Clear the query + results back to idle. */
  reset: () => void;
}

export function useUserSearch(
  opts: { debounceMs?: number; limit?: number } = {},
): UseUserSearchResult {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const limit = opts.limit ?? DEFAULT_LIMIT;

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const [results, setResults] = useState<ProfileResponse[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Track the AbortController for the in-flight request. When a new query
  // arrives, we abort the previous one before starting the new fetch.
  const abortRef = useRef<AbortController | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  // Filter out the current user from results so you can't search for yourself.
  // Memoized so the reference is stable when currentUserId doesn't change.
  const filteredResults = useMemo(
    () =>
      results.filter(
        (u) => currentUserId == null || String(u.id) !== String(currentUserId),
      ),
    [results, currentUserId],
  );

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    // Empty / too-short query → reset to idle, no request.
    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Abort any in-flight request from a previous longer query.
      abortRef.current?.abort();
      abortRef.current = null;
      setStatus("idle");
      setError(null);
      setResults([]);
      return;
    }

    // Abort the previous in-flight request (if any) before starting a new one.
    // This is the key race-condition guard: without it, a slow earlier
    // request could resolve AFTER a faster later one and overwrite its
    // results with stale data.
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const data = await searchUsers(trimmed, {
          limit,
          signal: controller.signal,
        });
        // If the request was aborted after this point (a newer query
        // superseded it), `controller.signal.aborted` will be true and we
        // must NOT update state — the newer request owns the UI now.
        if (controller.signal.aborted) return;
        setResults(data);
        setStatus("success");
      } catch (err) {
        // Axios throws a CanceledError when aborted — ignore those entirely.
        if (controller.signal.aborted) return;
        if (isAbortError(err)) return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" &&
                err !== null &&
                "response" in err
              ? (err as { response?: { data?: { detail?: string } } }).response
                  ?.data?.detail ?? "Search failed"
              : "Search failed";
        setError(msg);
        setStatus("error");
      } finally {
        // Only clear the ref if it still points at OUR controller — a newer
        // request may have already replaced it.
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    })();

    // Cleanup: abort on unmount or when the query changes again.
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, limit]);

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setQuery("");
    setResults([]);
    setStatus("idle");
    setError(null);
  }

  return {
    query,
    setQuery,
    results: filteredResults,
    status,
    error,
    reset,
  };
}

/** True if the error is an AbortError (request was cancelled). */
function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  // Axios wraps aborts in a CanceledError — check its `code` field.
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "ERR_CANCELED" || code === "CanceledError") return true;
  }
  return false;
}
