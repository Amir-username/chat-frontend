// ---------------------------------------------------------------------------
// Private chat domain types — mirror the Pydantic schemas in
// chat-service/app/private_chat.py.
//
// A "private chat" is a 1-on-1 conversation between two users. The backend
// persists both the chat (PrivateChat) and its messages (PrivateMessage),
// and exposes REST + WebSocket endpoints under /private/*.
// ---------------------------------------------------------------------------

import type { UserId } from "./user";

/**
 * POST /private/chats — the chat details (no messages).
 * Returned when starting a new chat or fetching an existing one.
 */
export interface PrivateChatDetail {
  id: number;
  user1_id: number;
  user2_id: number;
  created_at: string; // ISO-8601
}

/**
 * GET /private/chats — a list item for each conversation the current user
 * is part of. Pre-resolves the "other user" so the sidebar can render
 * without extra profile fetches.
 */
export interface PrivateChatListItem {
  id: number;
  other_user_id: number;
  other_user_name: string;
  /** Relative URL path (e.g. `/uploads/...`) or null. */
  other_user_image: string | null;
  /** Preview text of the most recent message, or null if no messages yet. */
  last_message: string | null;
  /** ISO-8601 timestamp of the most recent message, or null. */
  last_message_at: string | null;
  created_at: string;
}

/**
 * Snippet of the message being replied to (Telegram-style).
 *
 * Embedded inside `PrivateMessage.reply_to` when the sender was replying
 * to an earlier message. Mirrors the backend's `ReplyPreview` Pydantic
 * model. Always present on `PrivateMessage.reply_to` (never null) — the
 * field itself is null when there's no reply.
 */
export interface ReplyPreview {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string; // ISO-8601
}

/**
 * A single message in a private chat. Used both in REST responses
 * (GET /private/chats/{id}) and in WebSocket frames.
 *
 * `sender_id` lets the UI decide left vs. right alignment: messages from
 * the current user go right, from the other user go left.
 *
 * `reply_to` is null for plain messages, or a `ReplyPreview` of the
 * quoted message when the sender was replying to something.
 */
export interface PrivateMessage {
  id: number;
  chat_id: number;
  sender_id: UserId;
  sender_name: string;
  content: string;
  /** The message this one is replying to, or null. */
  reply_to: ReplyPreview | null;
  created_at: string; // ISO-8601
}

/**
 * GET /private/chats/{chat_id} — chat details plus a page of messages plus
 * the other participant's info.
 */
export interface PrivateChatWithMessages {
  chat: PrivateChatDetail;
  messages: PrivateMessage[];
  other_user_id: number;
  other_user_name: string;
  other_user_image: string | null;
}

/** POST /private/chats request body — start a chat with a specific user. */
export interface StartPrivateChatPayload {
  user_id: number;
}

/** POST /private/chats/{chat_id}/messages request body. */
export interface SendPrivateMessagePayload {
  content: string;
  /** Optional ID of the message to reply to. The backend validates that
   *  the referenced message exists in the same chat. */
  reply_to_id?: number | null;
}

// ---------------------------------------------------------------------------
// WebSocket message shapes — what the /private/ws/chat/{chat_id} socket
// emits. The client sends `{"content": "..."}` and receives the variants
// below (discriminated by `type`).
// ---------------------------------------------------------------------------

/**
 * Inbound WebSocket frame from the private-chat socket.
 *
 * - `"message"` — a chat message (from either participant, broadcast to both).
 * - `"system"` — a system notice (e.g. "Alice is online", "Bob went offline").
 * - `"history"` — the last 50 messages, sent once on connect.
 */
export type PrivateChatWsMessage =
  | { type: "message" } & PrivateMessage
  | { type: "system"; content: string; chat_id: number }
  | { type: "history"; messages: PrivateMessage[] };

/** Outgoing payload — `content` is required; `reply_to_id` is optional
 *  and only sent when replying to a specific message. */
export interface PrivateOutgoingMessage {
  content: string;
  reply_to_id?: number | null;
}

/** Type guard: narrow a WsMessage to its `message` variant. */
export function isPrivateMessage(
  m: PrivateChatWsMessage,
): m is Extract<PrivateChatWsMessage, { type: "message" }> {
  return m.type === "message";
}

/** Type guard: narrow a WsMessage to its `history` variant. */
export function isPrivateHistory(
  m: PrivateChatWsMessage,
): m is Extract<PrivateChatWsMessage, { type: "history" }> {
  return m.type === "history";
}
