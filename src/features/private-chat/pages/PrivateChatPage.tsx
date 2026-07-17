// ---------------------------------------------------------------------------
// PrivateChatPage — two-pane direct-messages view.
//
// Layout:
//   Desktop:  [conversation list] [active chat with topbar]
//   Mobile:   [conversation list] OR [active chat with topbar + back button]
//
// The active chat's topbar shows the other participant's avatar + name
// (clickable → their public profile), like Telegram/WhatsApp. Messages are
// right-aligned for the current user, left-aligned for the other user.
//
// Realtime: a WebSocket is opened for the active chat (usePrivateChatSocket).
// On connect, the server sends the last 50 messages as a `history` frame.
// Sending goes through the socket (not REST) for snappy delivery.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PrivateChatList from "../components/PrivateChatList";
import PrivateMessageList from "../components/PrivateMessageList";
import MessageInput from "@/features/chat/components/MessageInput";
import { usePrivateChatSocket, type PrivateConnectionStatus } from "../hooks/usePrivateChatSocket";
import { getPrivateChat } from "../api/privateChat";
import { useAuthStore, Avatar } from "@/features/auth";
import type {
  PrivateChatWithMessages,
  PrivateChatWsMessage,
} from "@/shared/types";

const STATUS_LABEL: Record<PrivateConnectionStatus, string> = {
  idle: "idle",
  connecting: "connecting…",
  open: "connected",
  closed: "reconnecting…",
  error: "error",
};

const STATUS_COLOR: Record<PrivateConnectionStatus, string> = {
  idle: "#6b7280",
  connecting: "#f59e0b",
  open: "#22c55e",
  closed: "#f59e0b",
  error: "#ef4444",
};

export default function PrivateChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);

  // The currently-open chat. Initialized from `?chat=<id>` in the URL so
  // deep-links work (e.g. "Message" button on a profile starts a chat and
  // navigates here with the new chat ID). Selecting a chat from the list
  // updates the URL; the URL is the source of truth.
  const chatParam = searchParams.get("chat");
  const activeChatId = useMemo(() => {
    const n = chatParam ? Number(chatParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [chatParam]);

  const setActiveChatId = useCallback(
    (id: number | null) => {
      setSearchParams(
        id == null ? {} : { chat: String(id) },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Snapshot of the active chat's details (other user info, etc.) fetched
  // once when the chat is opened.
  const [activeChat, setActiveChat] = useState<PrivateChatWithMessages | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Messages stream — seeded from the REST fetch, then updated live by the
  // WebSocket. Cleared whenever the active chat changes.
  const [messages, setMessages] = useState<PrivateChatWsMessage[]>([]);

  // ----- REST: load the active chat's details + initial messages -----
  useEffect(() => {
    if (activeChatId == null) {
      setActiveChat(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingChat(true);
    setChatError(null);
    setMessages([]);
    (async () => {
      try {
        const data = await getPrivateChat(activeChatId);
        if (!cancelled) {
          setActiveChat(data);
          // Seed the message list from REST; the WebSocket's `history` frame
          // would be redundant, so we ignore history if it arrives (see the
          // onMessage handler — we skip history when we already have messages).
          setMessages(data.messages.map((m) => ({ type: "message" as const, ...m })));
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(
            err instanceof Error ? err.message : "Failed to load chat",
          );
        }
      } finally {
        if (!cancelled) setLoadingChat(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // ----- WebSocket: realtime updates for the active chat -----
  const onMessage = useCallback((msg: PrivateChatWsMessage) => {
    setMessages((prev) => {
      // The server sends a `history` frame on connect. If we already seeded
      // from REST, skip it to avoid duplicates.
      if (msg.type === "history") {
        if (prev.length > 0) return prev;
        return msg.messages.map((m) => ({ type: "message" as const, ...m }));
      }
      // Dedupe by id for `message` frames — the WS broadcasts to both
      // participants, and we also get a copy when the other user sends.
      if (msg.type === "message" && "id" in msg) {
        if (prev.some((p) => p.type === "message" && p.id === msg.id)) {
          return prev;
        }
      }
      return [...prev, msg];
    });
  }, []);

  const { status, send } = usePrivateChatSocket({
    chatId: activeChatId,
    onMessage,
  });

  // ----- Mobile: whether to show the list or the active chat -----
  // On wide screens we show both panes; on narrow screens we toggle.
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showListOnly = isMobile && activeChatId == null;
  const showChatOnly = isMobile && activeChatId != null;

  const headerStatus = useMemo(
    () => (
      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: STATUS_COLOR[status] }}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {STATUS_LABEL[status]}
      </span>
    ),
    [status],
  );

  const otherUserId = activeChat?.other_user_id ?? null;
  const otherUserName = activeChat?.other_user_name ?? "";
  const otherUserImage = activeChat?.other_user_image ?? null;

  const disconnected =
    status === "closed" || status === "error" || status === "connecting";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ----- Left: conversation list ----- */}
      {(!isMobile || showListOnly) && (
        <div className={isMobile ? "w-full" : "w-80 flex-shrink-0"}>
          <PrivateChatList
            activeChatId={activeChatId}
            onSelect={(id) => setActiveChatId(id)}
            onNewChat={() => navigate("/chat")}
            showBackButton={isMobile}
            onBack={() => navigate("/chat")}
          />
        </div>
      )}

      {/* ----- Right: active chat ----- */}
      {(!isMobile || showChatOnly) && (
        <main className="flex-1 flex flex-col min-w-0 bg-bg-0">
          {activeChatId == null ? (
            <div className="flex-1 flex items-center justify-center text-fg-2 text-sm px-6 text-center">
              Select a conversation to start chatting
            </div>
          ) : loadingChat ? (
            <div className="flex-1 flex items-center justify-center text-fg-2 text-sm">
              Loading chat…
            </div>
          ) : chatError ? (
            <div className="flex-1 flex items-center justify-center text-red-500 text-sm px-6 text-center">
              {chatError}
            </div>
          ) : (
            <>
              {/* Topbar — Telegram-style: avatar + name (clickable → profile)
                  + connection status. On mobile, a back button sits on the
                  left to return to the conversation list. */}
              <header className="h-14 flex-shrink-0 border-b border-bg-3 flex items-center gap-3 px-3 bg-bg-1">
                {isMobile && (
                  <button
                    onClick={() => setActiveChatId(null)}
                    className="btn btn-ghost px-2 py-1 text-sm"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                )}
                <Avatar
                  userId={otherUserId}
                  name={otherUserName}
                  imageUrl={otherUserImage}
                  size={36}
                  href={`/users/${otherUserId}`}
                  interactive
                />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => otherUserId != null && navigate(`/users/${otherUserId}`)}
                    className="font-semibold text-[15px] text-fg-0 hover:underline truncate block max-w-full text-left"
                    title={`View ${otherUserName}'s profile`}
                  >
                    {otherUserName}
                  </button>
                  <div className="text-[11px] text-fg-2">
                    {headerStatus}
                  </div>
                </div>
              </header>

              <PrivateMessageList
                messages={messages}
                currentUserId={currentUser?.id}
                otherUserId={otherUserId ?? 0}
                otherUserName={otherUserName}
                otherUserImage={otherUserImage}
              />

              <MessageInput
                onSend={send}
                disabled={status !== "open"}
                disconnected={disconnected && status !== "connecting"}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}
