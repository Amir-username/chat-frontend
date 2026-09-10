// ---------------------------------------------------------------------------
// Single source of truth for the backend base URL.
//
// - Set VITE_API_BASE_URL (e.g. "https://chat-service.example.com") for
//   production builds that talk to a deployed backend directly.
// - Leave it EMPTY for development: the Vite dev server proxies /api,
//   /private/ws and /uploads to the backend, so the browser only ever makes
//   same-origin requests (no CORS setup needed).
//
// Every network touchpoint (axios client, image URLs, WebSocket URLs) MUST
// derive its base from this module instead of hardcoding an origin.
// ---------------------------------------------------------------------------

const envBase = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, ""); // strip trailing slashes

/** Backend origin, or "" when running behind the Vite dev proxy. */
export const API_BASE_URL: string = envBase;

/**
 * Axios baseURL: the explicit backend origin when provided, otherwise "/api"
 * so the Vite dev proxy forwards requests to the backend.
 */
export const AXIOS_BASE_URL: string = envBase || "/api";

/**
 * WebSocket origin for building ws(s):// URLs.
 * - Explicit env base: convert http(s) to ws(s).
 * - No env base: derive from the current page origin (dev proxy handles
 *   the rest).
 */
export function wsBaseUrl(): string {
  if (envBase) return envBase.replace(/^http/, "ws");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
