// ---------------------------------------------------------------------------
// Image URL helper.
//
// The backend returns profile image URLs as relative paths (e.g.
// `/uploads/profile_images/1_abc.jpg`). In dev the Vite proxy forwards /uploads
// to the backend, so relative paths work as-is. In production with
// VITE_API_BASE_URL set, we need to prepend that base URL.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Resolve a (possibly relative) image URL to one the browser can fetch.
 *
 * - `null` / `undefined` / `""` → returns null (caller should render a fallback)
 * - Already absolute (`http://...`, `https://...`, `data:...`) → returned as-is
 * - Relative (`/uploads/...`) → prepended with VITE_API_BASE_URL (empty in dev,
 *   so the Vite proxy handles it)
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already absolute or a data URI — leave it alone.
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  // Relative path — prepend the API base URL (empty string in dev, so this
  // is a no-op there; the Vite proxy handles /uploads).
  return `${API_BASE}${url}`;
}
