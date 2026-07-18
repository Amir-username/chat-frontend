// ---------------------------------------------------------------------------
// Shared infrastructure barrel.
//
// Cross-cutting utilities used by both features — the typed axios client and
// the shared TypeScript types (mirroring the backend Pydantic schemas).
// ---------------------------------------------------------------------------

// API client (axios instance with 401-refresh interceptor)
export { api, apiGet, apiPost, apiPatch } from "./api/client";
export { tokenStorage } from "./api/tokens";
export { resolveImageUrl } from "./api/imageUrl";

// Hooks
export { useDebouncedValue } from "./hooks/useDebouncedValue";

// Types — re-export everything from the types barrel
export * from "./types";
