// ---------------------------------------------------------------------------
// Typed axios client for the chat-service backend.
//
// Key behaviours:
//   1. baseURL comes from shared/api/config.ts — VITE_API_BASE_URL in
//      production, "/api" (Vite proxy) in development.
//   2. Request interceptor attaches `Authorization: Bearer <access>` if present.
//   3. Response interceptor handles 401:
//        - refresh the access token via /auth/refresh (refreshAccessToken)
//        - on success, retry the original request once with the new token
//        - on failure, clear tokens and redirect to /login
//   4. Concurrent 401s are coalesced — refreshAccessToken() returns the SAME
//      in-flight promise to every caller, so only one refresh request flies
//      at a time. WebSocket hooks reuse the same helper before reconnecting.
// ---------------------------------------------------------------------------

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiErrorBody, TokenOut } from "@/shared/types";
import { tokenStorage } from "./tokens";
import { AXIOS_BASE_URL } from "./config";

export const api: AxiosInstance = axios.create({
  baseURL: AXIOS_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Refresh-on-401 machinery
// ---------------------------------------------------------------------------

/** The in-flight refresh promise, shared by all callers (axios interceptor,
 *  WebSocket hooks, anything else that needs a fresh access token). */
let refreshInFlight: Promise<string> | null = null;

/**
 * Refresh the access token using the stored refresh token.
 *
 * - Coalesced: while a refresh is in flight, every caller awaits the same
 *   promise — exactly one network request is made.
 * - On success, stores the new token pair and resolves with the access token.
 * - On failure, clears tokens and redirects to /login, then rejects.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokenStorage.refresh;
  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token"));
  }

  refreshInFlight = axios
    .post<TokenOut>(
      `${AXIOS_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } },
    )
    .then(({ data }) => {
      tokenStorage.set(data);
      return data.access_token;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Attach access token to every outgoing request.
api.interceptors.request.use((config) => {
  const t = tokenStorage.access;
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined;

    // If the request never got a config, or we've already retried, give up.
    if (!original || original._retried) {
      return Promise.reject(error);
    }

    // Only auto-refresh on 401 from endpoints OTHER than /auth/refresh itself.
    const status = error.response?.status;
    const url = original.url ?? "";
    const isRefreshCall = url.includes("/auth/refresh");

    if (status !== 401 || isRefreshCall) {
      return Promise.reject(error);
    }

    // No refresh token? Bail to login.
    if (!tokenStorage.refresh) {
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(error);
    }

    // Refresh (coalesced with any other concurrent 401s) and retry once.
    try {
      const token = await refreshAccessToken();
      original.headers!.Authorization = `Bearer ${token}`;
      original._retried = true;
      return api(original);
    } catch (refreshErr) {
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(refreshErr);
    }
  },
);

function redirectToLogin(): void {
  // Avoid redirect loops if we're already on /login.
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login");
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers for typed requests.
// ---------------------------------------------------------------------------

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const r = await api.get<T>(url, config);
  return r.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const r = await api.post<T>(url, body, config);
  return r.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const r = await api.patch<T>(url, body, config);
  return r.data;
}
