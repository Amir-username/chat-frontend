// ---------------------------------------------------------------------------
// usePrivateChatSocket — WebSocket lifecycle for a single private chat.
//
// Backend contract (from chat-service/app/private_chat.py):
//   URL:    ws://host/private/ws/chat/{chat_id}?token=<access_token>
//   Send:   { "content": "hello" }
//   Recv:   { "type": "message" | "system" | "history", ... }
//
// Responsibilities:
//   - Build the correct ws:// or wss:// URL from shared/api/config.ts
//     (VITE_API_BASE_URL in production, same-origin in dev via the proxy).
//   - Refresh an expired access token BEFORE connecting, so a session that
//     outlived its access token reconnects cleanly instead of failing forever.
//   - Reconnect with exponential backoff on transient failures.
//   - Expose a `send(content, replyToId?)` that's stable across renders.
//   - Expose connection status so the UI can show "connecting…".
//
// Stale-socket guard
// ------------------
// Every event handler captures its own `ws` instance and checks
// `wsRef.current === ws` before doing anything. If the ref no longer points
// at us, we're a stale socket and must silently bail out (no setStatus, no
// reconnect). This survives React 18 StrictMode's mount → unmount → remount
// cycle without creating connect/disconnect storms.
//
// Async-sequence guard
// --------------------
// connect() is async (it may await a token refresh). A rapid chat switch
// could otherwise let an old in-flight connect() open a socket AFTER a newer
// connect() ran. Every connect() bumps a sequence counter; after each await,
// the connect aborts itself if the counter moved on (or cleanup() ran).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PrivateChatWsMessage,
  PrivateOutgoingMessage,
} from "@/shared/types";
import { tokenStorage } from "@/shared/api/tokens";
import { refreshAccessToken } from "@/shared/api/client";
import { wsBaseUrl } from "@/shared/api/config";

export type PrivateConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

interface UsePrivateChatSocketOptions {
  chatId: number | null;
  /** Called once per inbound message (history arrives as a single
   *  `history` message; the consumer decides how to merge it). */
  onMessage: (msg: PrivateChatWsMessage) => void;
  /** Called when the socket closes unintentionally. Optional. */
  onClose?: (reason: string) => void;
}

interface UsePrivateChatSocketResult {
  status: PrivateConnectionStatus;
  /** Send a message. Optional `replyToId` quotes an earlier message —
   *  the backend validates it belongs to the same chat. */
  send: (content: string, replyToId?: number | null) => void;
  reconnect: () => void;
}

function buildWsUrl(chatId: number, token: string): string {
  return `${wsBaseUrl()}/private/ws/chat/${chatId}?token=${encodeURIComponent(token)}`;
}

export function usePrivateChatSocket({
  chatId,
  onMessage,
  onClose,
}: UsePrivateChatSocketOptions): UsePrivateChatSocketResult {
  const [status, setStatus] = useState<PrivateConnectionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<number | null>(null);
  // Async-sequence guard: bumped by connect() and cleanup(); any connect
  // whose sequence is no longer current aborts itself after each await.
  const seqRef = useRef(0);
  // Did the CURRENT connect sequence ever reach "open"? Used to stop a
  // refresh-failure loop (e.g. revoked refresh token): one refresh attempt
  // per sequence, reset on a successful open.
  const openedRef = useRef(false);

  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onCloseRef.current = onClose;
  }, [onMessage, onClose]);

  const cleanup = useCallback(() => {
    seqRef.current++; // invalidate any in-flight async connect()
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      // Synchronously null the ref so any in-flight event handlers on this
      // socket see `wsRef.current !== ws` and bail out.
      wsRef.current = null;
      ws.close();
    }
  }, []);

  const connect = useCallback(async () => {
    cleanup();
    const seq = seqRef.current;

    if (chatId == null) {
      setStatus("idle");
      return;
    }

    let token = tokenStorage.access;
    if (!token) {
      setStatus("error");
      return;
    }

    // Access token expired (or about to)? Refresh it before connecting.
    // If a refresh already failed in this connect sequence, don't retry in a
    // loop — the user needs to log in again.
    if (!tokenStorage.hasValidAccess()) {
      setStatus("connecting");
      try {
        token = await refreshAccessToken();
      } catch {
        if (seq !== seqRef.current) return;
        setStatus("error");
        return;
      }
      if (seq !== seqRef.current) return; // stale connect (chat changed / unmounted)
    }

    if (seq !== seqRef.current) return;

    setStatus("connecting");

    const ws = new WebSocket(buildWsUrl(chatId, token));
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      openedRef.current = true;
      backoffRef.current = 1000; // reset backoff on success
      setStatus("open");
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      let data: PrivateChatWsMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return; // ignore malformed frames
      }
      onMessageRef.current(data);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setStatus("error");
    };

    ws.onclose = (event) => {
      // If wsRef no longer points at us, the close was intentional (chat
      // change, unmount, or manual reconnect) — don't schedule a retry.
      if (wsRef.current !== ws) return;
      openedRef.current = false;
      setStatus("closed");
      onCloseRef.current?.(event.reason || "connection closed");

      // Reconnect with exponential backoff (cap at 15s). The next connect()
      // refreshes the access token if it has expired in the meantime.
      const delay = Math.min(backoffRef.current, 15_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15_000);
      reconnectTimerRef.current = window.setTimeout(() => {
        void connect();
      }, delay);
    };
  }, [chatId, cleanup]);

  // Connect whenever chatId changes; tear down on unmount.
  useEffect(() => {
    void connect();
    return cleanup;
  }, [connect, cleanup]);

  const send = useCallback((content: string, replyToId?: number | null) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // Only include `reply_to_id` when it's a real number — omitting it
    // entirely is cleaner than sending `null` (and matches the backend's
    // optional-field semantics).
    const payload: PrivateOutgoingMessage =
      replyToId != null ? { content, reply_to_id: replyToId } : { content };
    ws.send(JSON.stringify(payload));
  }, []);

  const reconnect = useCallback(() => {
    backoffRef.current = 1000;
    void connect();
  }, [connect]);

  return { status, send, reconnect };
}
