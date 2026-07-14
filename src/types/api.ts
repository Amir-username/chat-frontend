// ---------------------------------------------------------------------------
// Shared HTTP API types.
//
// These cover cross-cutting shapes that don't belong to a single domain —
// error envelopes, pagination wrappers, etc.
// ---------------------------------------------------------------------------

/**
 * Error envelope returned by fast-auth's exception handler.
 *
 * The backend's `auth_error_handler` produces:
 *   `{ "detail": "<message>", "code": "<machine-readable code>" }`
 *
 * `code` is optional because FastAPI's default 422 validation errors use a
 * different shape (an array under `detail`) — only auth errors include `code`.
 */
export interface ApiErrorBody {
  detail: string;
  code?: string;
}
