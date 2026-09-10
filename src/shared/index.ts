// ---------------------------------------------------------------------------
// Shared infrastructure barrel.
//
// Cross-cutting utilities used by the features — the typed axios client,
// tokens, API config, common hooks/components, and the domain types
// (mirroring the backend Pydantic schemas).
// ---------------------------------------------------------------------------

// API config (single source of truth for the backend base URL)
export { API_BASE_URL, AXIOS_BASE_URL, wsBaseUrl } from "./api/config";

// API client (axios instance with 401-refresh interceptor)
export { api, apiGet, apiPost, apiPatch, refreshAccessToken } from "./api/client";
export { tokenStorage } from "./api/tokens";
export { resolveImageUrl } from "./api/imageUrl";

// Hooks
export { useDebouncedValue } from "./hooks/useDebouncedValue";
export { useMediaQuery } from "./hooks/useMediaQuery";

// Utils
export { colorForUser, readableTextOn } from "./utils/colors";

// Types — re-export everything from the types barrel
export * from "./types";
