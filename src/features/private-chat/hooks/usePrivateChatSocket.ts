// ---------------------------------------------------------------------------
// usePrivateChatSocket — WebSocket lifecycle for a single private chat.
//
// Backend contract (from chat-service/app/private_chat.py):
//   URL:    ws://host/private/ws/chat/{chat_id}?token=<access_token>
//   Send:   { "content": "hello" }
//   Recv:   { "type": "message" | "system" | "history", ... }
//
// Differs from useChatSocket (public rooms) in a few ways:
//   - Path is /private/ws/chat/{chat_id} (not /ws/chat/{room_id}).
//   - Messages carry `sender_id` so the UI can align them left/right.
//   - History is the last 50 messages (server sends on connect).
//   - System messages are "X is online" / "X went offline".
//
// Same StrictMode-safe stale-socket guard as useChatSocket: every event
// handler captures its own `ws` instance and bails out if `wsRef.current`
// no longer points at it.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PrivateChatWsMessage,
  PrivateOutgoingMessage,
} from "@/shared/types";
import { tokenStorage } from "@/shared/api/tokens";

export type PrivateConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

interface UsePrivateChatSocketOptions {
  chatId: number | null;
  /** Called once per inbound message (history entries arrive as a single
   *  `history` message and are unwrapped before being passed here). */
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
  const explicitBase = import.meta.env.VITE_API_BASE_URL;
  if (explicitBase) {
    const wsBase = explicitBase.replace(/^http/, "ws");
    return `${wsBase}/private/ws/chat/${chatId}?token=${encodeURIComponent(token)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/private/ws/chat/${chatId}?token=${encodeURIComponent(token)}`;
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
      wsRef.current = null;
      ws.close();
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (chatId == null) {
      setStatus("idle");
      return;
    }
    const token = tokenStorage.access;
    if (!token) {
      setStatus("error");
      return;
    }

    setStatus("connecting");

    const ws = new WebSocket(buildWsUrl(chatId, token));
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      backoffRef.current = 1000;
      setStatus("open");
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      let data: PrivateChatWsMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      onMessageRef.current(data);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setStatus("error");
    };

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return;
      setStatus("closed");
      onCloseRef.current?.(event.reason || "connection closed");

      const delay = Math.min(backoffRef.current, 15_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15_000);
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [chatId, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const send = useCallback(
    (content: string, replyToId?: number | null) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // Only include `reply_to_id` when it's a real number — omitting it
      // entirely is cleaner than sending `null` (and matches the backend's
      // optional-field semantics).
      const payload: PrivateOutgoingMessage =
        replyToId != null
          ? { content, reply_to_id: replyToId }
          : { content };
      ws.send(JSON.stringify(payload));
    },
    [],
  );

  const reconnect = useCallback(() => {
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  return { status, send, reconnect };
}
