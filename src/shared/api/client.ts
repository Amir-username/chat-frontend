// ---------------------------------------------------------------------------
// Typed axios client for the chat-service backend.
//
// Key behaviours:
//   1. baseURL is "/api" in dev (proxied to http://localhost:8000 by Vite) or
//      VITE_API_BASE_URL in production.
//   2. Request interceptor attaches `Authorization: Bearer <access>` if present.
//   3. Response interceptor handles 401:
//        - try to refresh the access token via /auth/refresh
//        - on success, retry the original request once with the new token
//        - on failure, clear tokens and redirect to /login
//   4. Concurrent 401s are coalesced — only one refresh request flies at a
//      time; queued requests are replayed once it resolves.
// ---------------------------------------------------------------------------

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiErrorBody, TokenOut } from "@/shared/types";
import { tokenStorage } from "./tokens";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Refresh-on-401 machinery
// ---------------------------------------------------------------------------

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/** Replay every queued request with the new access token. */
function flushQueue(token: string | null, error: unknown = null): void {
  pendingQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token as string);
  });
  pendingQueue = [];
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

    // If another request is already refreshing, queue this one.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers!.Authorization = `Bearer ${token}`;
            original._retried = true;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    // No refresh token? Bail to login.
    const refreshToken = tokenStorage.refresh;
    if (!refreshToken) {
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(error);
    }

    isRefreshing = true;
    try {
      // Hit /auth/refresh directly via a bare axios call so we don't recurse
      // through this interceptor.
      const { data } = await axios.post<TokenOut>(
        `${baseURL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );
      tokenStorage.set(data);

      // Replay queued requests with the fresh token.
      flushQueue(data.access_token);

      // Retry the original request.
      original.headers!.Authorization = `Bearer ${data.access_token}`;
      original._retried = true;
      return api(original);
    } catch (refreshErr) {
      flushQueue(null, refreshErr);
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
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
// Convenience wrapper for typed requests.
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
