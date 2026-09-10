// ---------------------------------------------------------------------------
// PrivateMessageList — Telegram-style 1-on-1 message view.
// ---------------------------------------------------------------------------

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  isPrivateMessage,
  type PrivateChatWsMessage,
  type PrivateMessage,
  type ReplyPreview,
  type UserId,
} from "@/shared/types";
import { Avatar } from "@/features/auth";

interface PrivateMessageListProps {
  messages: PrivateChatWsMessage[];
  currentUserId: UserId | undefined;
  otherUserId: UserId;
  otherUserName: string;
  otherUserImage: string | null;
  onReply?: (msg: PrivateMessage) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function previewLine(content: string, max = 80): string {
  const firstLine = content.split("\n")[0] ?? "";
  return firstLine.length > max ? firstLine.slice(0, max) + "…" : firstLine;
}

interface RenderedRow {
  kind: "system" | "message";
  content: string;
  timestamp: string;
  senderId?: UserId;
  messageId?: number;
  senderName?: string;
  replyTo?: ReplyPreview | null;
  isOwn: boolean;
  showAvatar: boolean;
  key: string;
}

function toRendered(
  messages: PrivateChatWsMessage[],
  currentUserId: UserId | undefined,
): RenderedRow[] {
  const out: RenderedRow[] = [];
  messages.forEach((msg, idx) => {
    if (msg.type === "system") {
      out.push({
        kind: "system",
        content: msg.content,
        timestamp: "",
        isOwn: false,
        showAvatar: false,
        key: `sys-${idx}`,
      });
      return;
    }
    if (!isPrivateMessage(msg)) return;

    const prev = messages[idx - 1];
    const prevSender =
      prev && isPrivateMessage(prev) ? prev.sender_id : undefined;
    const isOwn = msg.sender_id === currentUserId;
    const showAvatar =
      !isOwn && (prevSender !== msg.sender_id || prev?.type !== "message");

    out.push({
      kind: "message",
      content: msg.content,
      timestamp: msg.created_at,
      senderId: msg.sender_id,
      messageId: msg.id,
      senderName: msg.sender_name,
      replyTo: msg.reply_to,
      isOwn,
      showAvatar,
      key: `msg-${idx}`,
    });
  });
  return out;
}

function ReplyQuote({ reply, isOwn }: { reply: ReplyPreview; isOwn: boolean }) {
  return (
    <div
      className={
        "mb-1.5 px-2 py-1 rounded-md text-[12px] border-l-2 " +
        (isOwn
          ? "bg-white/15 border-white/60 text-white/90"
          : "bg-bg-3 border-accent text-fg-1")
      }
    >
      <div
        className={
          "font-semibold truncate " + (isOwn ? "text-white" : "text-accent")
        }
      >
        {reply.sender_name}
      </div>
      <div className="truncate opacity-80">{previewLine(reply.content)}</div>
    </div>
  );
}

function MessageBubbleWrapper({
  isOwn,
  onReplyTrigger,
  children,
}: {
  isOwn: boolean;
  onReplyTrigger: () => void;
  children: ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
    longPressTimer.current = setTimeout(() => {
      onReplyTrigger();
      setDragX(0);
      setIsDragging(false);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    let delta = currentX - startX.current;
    if (Math.abs(delta) > 10 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isOwn) {
      delta = Math.min(0, Math.max(-80, delta));
    } else {
      delta = Math.max(0, Math.min(80, delta));
    }
    setDragX(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (Math.abs(dragX) > 40) {
      onReplyTrigger();
    }
    setDragX(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${dragX}px)`,
        transition: isDragging ? "none" : "transform 0.2s ease-out",
        touchAction: "pan-y",
      }}
      className="flex items-end gap-1"
    >
      {children}
    </div>
  );
}

function PrivateMessageList({
  messages,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserImage,
  onReply,
}: PrivateMessageListProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const rendered = toRendered(messages, currentUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-2 text-[13px] px-6 text-center">
        {t("chat.noMessagesYet")}
      </div>
    );
  }

  function handleReply(row: RenderedRow) {
    if (!onReply || row.messageId == null || row.senderName == null) return;
    const msg: PrivateMessage = {
      id: row.messageId,
      chat_id: 0,
      sender_id: row.senderId ?? 0,
      sender_name: row.senderName,
      content: row.content,
      reply_to: row.replyTo ?? null,
      created_at: row.timestamp,
    };
    onReply(msg);
  }

  return (
    <div className="message-list flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
      {rendered.map((row) => {
        if (row.kind === "system") {
          return (
            <div key={row.key} className="text-center text-fg-2 text-xs py-1.5">
              — {row.content} —
            </div>
          );
        }

        const isOwn = row.isOwn;
        return (
          <div
            key={row.key}
            className={
              "group flex gap-2.5 items-end " +
              (isOwn ? "flex-row-reverse" : "flex-row")
            }
          >
            {!isOwn && (
              <div className={row.showAvatar ? "visible" : "invisible"}>
                <Avatar
                  userId={row.senderId ?? otherUserId}
                  name={otherUserName}
                  imageUrl={otherUserImage}
                  size={32}
                  href={`/users/${otherUserId}`}
                  interactive
                />
              </div>
            )}

            <MessageBubbleWrapper
              isOwn={isOwn}
              onReplyTrigger={() => handleReply(row)}
            >
              {onReply && !isOwn && (
                <button
                  onClick={() => handleReply(row)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-fg-2 hover:text-fg-0 px-1 py-1"
                  title={t("common.reply")}
                  aria-label={t("common.reply")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 14l-4-4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 10h9a5 5 0 015 5v3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              <div
                className={
                  "flex flex-col max-w-[70%] " +
                  (isOwn ? "items-end" : "items-start")
                }
              >
                <div
                  className={
                    "px-3 py-2 rounded-2xl break-words whitespace-pre-wrap " +
                    "text-sm leading-relaxed " +
                    (isOwn
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-bg-2 text-fg-0 rounded-bl-sm")
                  }
                >
                  {row.replyTo && (
                    <ReplyQuote reply={row.replyTo} isOwn={isOwn} />
                  )}
                  {row.content}
                </div>

                {row.timestamp && (
                  <span
                    className={
                      "text-[10px] text-fg-2 mt-0.5 " +
                      (isOwn ? "text-right" : "text-left")
                    }
                  >
                    {formatTime(row.timestamp)}
                  </span>
                )}
              </div>

              {onReply && isOwn && (
                <button
                  onClick={() => handleReply(row)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-fg-2 hover:text-fg-0 px-1 py-1"
                  title={t("common.reply")}
                  aria-label={t("common.reply")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 14l4-4-4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 10h-9a5 5 0 00-5 5v3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </MessageBubbleWrapper>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default memo(PrivateMessageList);
