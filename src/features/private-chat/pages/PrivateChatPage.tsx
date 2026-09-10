// ---------------------------------------------------------------------------
// PrivateChatPage — two-pane direct-messages view.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PrivateChatList from "../components/PrivateChatList";
import PrivateMessageList from "../components/PrivateMessageList";
import MessageInput, {
  type ReplyTarget,
} from "@/shared/components/MessageInput";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import {
  usePrivateChatSocket,
  type PrivateConnectionStatus,
} from "../hooks/usePrivateChatSocket";
import { getPrivateChat } from "../api/privateChat";
import { useAuthStore, Avatar } from "@/features/auth";
import type {
  PrivateChatWithMessages,
  PrivateChatWsMessage,
  PrivateMessage,
} from "@/shared/types";

const STATUS_COLOR: Record<PrivateConnectionStatus, string> = {
  idle: "#6b7280",
  connecting: "#f59e0b",
  open: "#22c55e",
  closed: "#f59e0b",
  error: "#ef4444",
};

export default function PrivateChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const chatParam = searchParams.get("chat");
  const activeChatId = useMemo(() => {
    const n = chatParam ? Number(chatParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [chatParam]);

  const setActiveChatId = useCallback(
    (id: number | null) => {
      setSearchParams(id == null ? {} : { chat: String(id) }, {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const [activeChat, setActiveChat] = useState<PrivateChatWithMessages | null>(
    null,
  );
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [messages, setMessages] = useState<PrivateChatWsMessage[]>([]);

  // True while the initial REST fetch for the active chat is in flight.
  // The WS history handler checks this ref (synchronously maintained) to
  // decide whether history or REST owns initial message population —
  // whichever finishes first wins, and neither clobbers the other.
  const loadingChatRef = useRef(false);

  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    setReplyTo(null);
    if (activeChatId == null) {
      loadingChatRef.current = false;
      setActiveChat(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    loadingChatRef.current = true;
    setLoadingChat(true);
    setChatError(null);
    setMessages([]);
    (async () => {
      try {
        const data = await getPrivateChat(activeChatId);
        if (!cancelled) {
          setActiveChat(data);
          // Only populate if the socket hasn't already delivered messages
          // (history/live) — otherwise we'd drop anything received meanwhile.
          setMessages((prev) =>
            prev.length > 0
              ? prev
              : data.messages.map((m) => ({ type: "message" as const, ...m })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(
            err instanceof Error ? err.message : t("chat.failedToLoadChat"),
          );
        }
      } finally {
        if (!cancelled) {
          loadingChatRef.current = false;
          setLoadingChat(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, t]);

  const onMessage = useCallback((msg: PrivateChatWsMessage) => {
    setMessages((prev) => {
      if (msg.type === "history") {
        // While the initial REST fetch is in flight, it owns population.
        if (loadingChatRef.current) return prev;
        // Otherwise the server's latest-50 snapshot is authoritative —
        // this also cleanly covers reconnects after a disconnection.
        return msg.messages.map((m) => ({ type: "message" as const, ...m }));
      }
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

  const handleSend = useCallback(
    (content: string) => {
      send(content, replyTo?.id);
      setReplyTo(null);
    },
    [send, replyTo],
  );

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const handleReply = useCallback((msg: PrivateMessage) => {
    setReplyTo({
      id: msg.id,
      senderName: msg.sender_name,
      contentPreview: msg.content.split("\n")[0] ?? "",
    });
  }, []);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const showListOnly = isMobile && activeChatId == null;
  const showChatOnly = isMobile && activeChatId != null;

  const statusLabel = useMemo(
    () => ({
      idle: t("connection.idle"),
      connecting: t("connection.connecting"),
      open: t("connection.connected"),
      closed: t("connection.reconnecting"),
      error: t("connection.error"),
    }),
    [t],
  );

  const headerStatus = useMemo(
    () => (
      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: STATUS_COLOR[status] }}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {statusLabel[status]}
      </span>
    ),
    [status, statusLabel],
  );

  const otherUserId = activeChat?.other_user_id ?? null;
  const otherUserName = activeChat?.other_user_name ?? "";
  const otherUserImage = activeChat?.other_user_image ?? null;

  const disconnected =
    status === "closed" || status === "error" || status === "connecting";

  return (
    <div className="flex h-screen overflow-hidden">
      {(!isMobile || showListOnly) && (
        <div className={isMobile ? "w-full" : "w-80 shrink-0"}>
          <PrivateChatList
            onLogout={handleLogout}
            activeChatId={activeChatId}
            onSelect={(id) => setActiveChatId(id)}
            showBackButton={isMobile}
            onBack={() => setActiveChatId(null)}
          />
        </div>
      )}

      {(!isMobile || showChatOnly) && (
        <main className="flex-1 flex flex-col min-w-0 bg-bg-0">
          {activeChatId == null ? (
            <div className="flex-1 flex items-center justify-center text-fg-2 text-sm px-6 text-center">
              {t("chat.selectConversation")}
            </div>
          ) : loadingChat ? (
            <div className="flex-1 flex items-center justify-center text-fg-2 text-sm">
              {t("chat.loadingChat")}
            </div>
          ) : chatError ? (
            <div className="flex-1 flex items-center justify-center text-red-500 text-sm px-6 text-center">
              {chatError}
            </div>
          ) : (
            <>
              <header className="h-14 shrink-0 border-b border-bg-3 flex items-center gap-3 px-3 bg-bg-1">
                {isMobile && (
                  <button
                    onClick={() => setActiveChatId(null)}
                    className="btn btn-ghost px-2 py-1 text-sm"
                    aria-label={t("chat.backToConversations")}
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
                    onClick={() =>
                      otherUserId != null && navigate(`/users/${otherUserId}`)
                    }
                    className="font-semibold text-[15px] text-fg-0 hover:underline truncate block max-w-full text-left"
                    title={t("profile.viewProfile", { name: otherUserName })}
                  >
                    {otherUserName}
                  </button>
                  <div className="text-[11px] text-fg-2">{headerStatus}</div>
                </div>
              </header>

              <PrivateMessageList
                messages={messages}
                currentUserId={currentUser?.id}
                otherUserId={otherUserId ?? 0}
                otherUserName={otherUserName}
                otherUserImage={otherUserImage}
                onReply={handleReply}
              />

              <MessageInput
                onSend={handleSend}
                disabled={status !== "open"}
                disconnected={disconnected && status !== "connecting"}
                replyTarget={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}
