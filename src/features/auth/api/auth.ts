// ---------------------------------------------------------------------------
// Auth API wrappers — one typed function per backend endpoint.
// ---------------------------------------------------------------------------

import { apiGet, apiPost } from "@/shared/api/client";
import type {
  LoginPayload,
  LogoutPayload,
  RefreshPayload,
  RegisterPayload,
  TokenOut,
  UserOut,
  UserResponse,
} from "@/shared/types";

/** POST /auth/register — custom endpoint that captures `name`. */
export function register(payload: RegisterPayload): Promise<UserResponse> {
  return apiPost<UserResponse>("/auth/register", payload);
}

/** POST /auth/login/json — JSON login (preferred over the OAuth2 form variant). */
export function login(payload: LoginPayload): Promise<TokenOut> {
  return apiPost<TokenOut>("/auth/login/json", payload);
}

/** POST /auth/refresh — rotates tokens. The axios interceptor calls this
 *  automatically on 401, but you can also call it manually. */
export function refresh(payload: RefreshPayload): Promise<TokenOut> {
  return apiPost<TokenOut>("/auth/refresh", payload);
}

/** POST /auth/logout — revokes the access (and optionally refresh) token. */
export function logout(payload: LogoutPayload = {}): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/logout", payload);
}

/** GET /auth/me — current user profile. */
export function getMe(): Promise<UserOut> {
  return apiGet<UserOut>("/auth/me");
}
