// ---------------------------------------------------------------------------
// Chat domain types — WebSocket message shapes.
//
// These match what the backend's `app/chat.py` emits and consumes over the
// `/ws/chat/{room_id}` WebSocket. See `chat_websocket()` in that file.
// ---------------------------------------------------------------------------

import type { UserId } from "./user";

/**
 * A single inbound WebSocket message from the chat server.
 *
 * The server emits three variants, discriminated by the `type` field:
 *
 * - `"message"` — a chat message from a user (broadcast to the room).
 * - `"system"`  — a system notice (e.g. "Alice joined the room").
 * - `"history"` — the full message history, sent once on connect. The
 *                 `messages` array contains only `message` and `system`
 *                 entries (never nested `history` frames).
 *
 * Use a `switch` on `msg.type` (or a type guard) to narrow the union.
 */
export type ChatMessage =
  | ChatUserMessage
  | ChatSystemMessage
  | ChatHistoryMessage;

/** A chat message from a user — broadcast to everyone in the room. */
export interface ChatUserMessage {
  type: "message";
  user_id: UserId;
  name: string;
  content: string;
  /** ISO-8601 UTC timestamp, e.g. `"2025-07-05T12:00:00Z"`. */
  timestamp: string;
}

/** A system notice — join/leave events, rendered centered and muted. */
export interface ChatSystemMessage {
  type: "system";
  content: string;
  timestamp: string;
}

/** History replay — sent once immediately on WebSocket connect. The
 *  `useChatSocket` hook unwraps this and feeds each entry to the UI
 *  individually, so consumers usually never see this variant directly. */
export interface ChatHistoryMessage {
  type: "history";
  messages: ChatMessage[];
}

/** Type guard: narrow a `ChatMessage` to its `message` variant. */
export function isUserMessage(m: ChatMessage): m is ChatUserMessage {
  return m.type === "message";
}

/** Type guard: narrow a `ChatMessage` to its `system` variant. */
export function isSystemMessage(m: ChatMessage): m is ChatSystemMessage {
  return m.type === "system";
}

/** Type guard: narrow a `ChatMessage` to its `history` variant. */
export function isHistoryMessage(m: ChatMessage): m is ChatHistoryMessage {
  return m.type === "history";
}

/**
 * Outgoing payload — what the *client* sends to the server.
 *
 * Only `content` is read by the server (see `chat_websocket` in
 * `app/chat.py`); the user identity is derived from the JWT in the query
 * string, so it's not included here.
 */
export interface OutgoingMessage {
  content: string;
}
