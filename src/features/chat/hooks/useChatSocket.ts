// ---------------------------------------------------------------------------
// useChatSocket — manages the WebSocket lifecycle for a single chat room.
//
// Backend contract (from chat-service/app/chat.py):
//   URL:    ws://host/ws/chat/{room_id}?token=<access_token>
//   Send:   { "content": "hello" }
//   Recv:   { "type": "message" | "system" | "history", ... }
//
// Responsibilities:
//   - Build the correct ws:// or wss:// URL based on the current page origin.
//   - Reconnect with exponential backoff on transient failures.
//   - On open, request history (the server sends it automatically).
//   - Expose a `send(content)` function that's stable across renders.
//   - Expose connection status so the UI can show "connecting…".
//
// Stale-socket guard
// ------------------
// React 18 StrictMode (dev only) mounts → unmounts → remounts every effect,
// which means our WebSocket effect runs twice on first paint. A naive
// `closedByUsRef` boolean doesn't survive this: the remount resets the flag
// before the first socket's `onclose` fires, so the close handler thinks it
// was unintentional and schedules a reconnect — creating an infinite
// connect/disconnect loop.
//
// Fix: every event handler captures its own `ws` instance and checks
// `wsRef.current === ws` before doing anything. If the ref no longer points
// at us, we're a stale socket and must silently bail out (no setStatus, no
// reconnect). This is safe because setting `wsRef.current = null` (in
// cleanup) or to a new socket (in connect) is synchronous, so by the time
// any async event fires the ref already reflects the new reality.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, OutgoingMessage } from "@/shared/types";
import { tokenStorage } from "@/shared/api/tokens";

export type ConnectionStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface UseChatSocketOptions {
  roomId: string | null;
  /** Called once per inbound message (history entries arrive as a single
   *  `history` message and are unwrapped before being passed here). */
  onMessage: (msg: ChatMessage) => void;
  /** Called when the socket closes (e.g. to surface a toast). Optional. */
  onClose?: (reason: string) => void;
}

interface UseChatSocketResult {
  status: ConnectionStatus;
  send: (content: string) => void;
  /** Manually disconnect + reconnect. Useful for a "reconnect" button. */
  reconnect: () => void;
}

// Build the absolute WebSocket URL for a room.
function buildWsUrl(roomId: string, token: string): string {
  // In dev, the Vite proxy forwards /ws -> ws://localhost:8000.
  // In production, VITE_API_BASE_URL may be set to the backend origin.
  const explicitBase = import.meta.env.VITE_API_BASE_URL;
  if (explicitBase) {
    // explicitBase is http(s)://host — convert to ws(s)://host
    const wsBase = explicitBase.replace(/^http/, "ws");
    return `${wsBase}/ws/chat/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
  }
  // Same-origin: derive from window.location.
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/chat/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
}

export function useChatSocket({
  roomId,
  onMessage,
  onClose,
}: UseChatSocketOptions): UseChatSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<number | null>(null);

  // Keep latest callbacks without re-running the connect effect.
  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onCloseRef.current = onClose;
  }, [onMessage, onClose]);

  const cleanup = useCallback(() => {
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

  const connect = useCallback(() => {
    // Always tear down any previous socket first. The old socket's onclose
    // handler will see `wsRef.current` no longer points at it and bail out
    // (no reconnect storm).
    cleanup();

    if (!roomId) {
      setStatus("idle");
      return;
    }
    const token = tokenStorage.access;
    if (!token) {
      setStatus("error");
      return;
    }

    setStatus("connecting");

    const ws = new WebSocket(buildWsUrl(roomId, token));
    wsRef.current = ws;

    ws.onopen = () => {
      // Stale guard: if we've already moved on to a newer socket (or
      // cleaned up), ignore this event entirely.
      if (wsRef.current !== ws) return;
      backoffRef.current = 1000; // reset backoff on success
      setStatus("open");
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      let data: ChatMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return; // ignore malformed frames
      }
      // The server sends history as a single message with an array; unwrap it
      // so the consumer just sees a flat stream of messages.
      if (data.type === "history" && Array.isArray(data.messages)) {
        data.messages.forEach((m) => onMessageRef.current(m));
        return;
      }
      onMessageRef.current(data);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setStatus("error");
    };

    ws.onclose = (event) => {
      // If wsRef no longer points at us, the close was intentional (room
      // change, unmount, or manual reconnect) — don't schedule a retry.
      if (wsRef.current !== ws) return;
      setStatus("closed");
      onCloseRef.current?.(event.reason || "connection closed");

      // Reconnect with exponential backoff (cap at 15s).
      const delay = Math.min(backoffRef.current, 15_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15_000);
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [roomId, cleanup]);

  // Connect whenever roomId changes; tear down on unmount.
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const send = useCallback((content: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload: OutgoingMessage = { content };
    ws.send(JSON.stringify(payload));
  }, []);

  const reconnect = useCallback(() => {
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  return { status, send, reconnect };
}
