// ---------------------------------------------------------------------------
// Private-chat REST API wrappers.
//
// Backend source: app/private_chat.py (router mounted at /private).
// All endpoints require a Bearer access token — the axios client attaches
// it automatically via the request interceptor.
// ---------------------------------------------------------------------------

import { apiGet, apiPost } from "@/shared/api/client";
import type {
  PrivateChatDetail,
  PrivateChatListItem,
  PrivateChatWithMessages,
  SendPrivateMessagePayload,
  StartPrivateChatPayload,
  PrivateMessage,
} from "@/shared/types";

/**
 * POST /private/chats — start (or fetch an existing) 1-on-1 chat with
 * another user. Returns the chat details (no messages).
 */
export function startPrivateChat(
  payload: StartPrivateChatPayload,
): Promise<PrivateChatDetail> {
  return apiPost<PrivateChatDetail>("/private/chats", payload);
}

/** GET /private/chats — list all private chats the current user is in. */
export function listPrivateChats(): Promise<PrivateChatListItem[]> {
  return apiGet<PrivateChatListItem[]>("/private/chats");
}

/**
 * GET /private/chats/{chat_id} — chat details + a page of messages + the
 * other participant's info. Messages are returned oldest-first within the
 * requested page (the backend reverses its newest-first query).
 *
 * `offset` and `limit` paginate the newest-first query, so offset=0 always
 * gives the most recent messages.
 */
export function getPrivateChat(
  chatId: number,
  opts: { offset?: number; limit?: number } = {},
): Promise<PrivateChatWithMessages> {
  const params = new URLSearchParams();
  if (opts.offset != null) params.set("offset", String(opts.offset));
  if (opts.limit != null) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiGet<PrivateChatWithMessages>(
    `/private/chats/${chatId}${qs ? `?${qs}` : ""}`,
  );
}

/**
 * POST /private/chats/{chat_id}/messages — send a message via HTTP.
 *
 * The backend persists the message AND pushes it to the other user's
 * WebSocket connection if they're online. The sender's own WebSocket also
 * receives the broadcast (see ws_manager.broadcast in private_chat.py), so
 * calling this is optional if the socket is open — but it's a useful
 * fallback when the socket is still connecting.
 */
export function sendPrivateMessage(
  chatId: number,
  payload: SendPrivateMessagePayload,
): Promise<PrivateMessage> {
  return apiPost<PrivateMessage>(`/private/chats/${chatId}/messages`, payload);
}
