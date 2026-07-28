import { memo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { isUserMessage, type ChatMessage, type UserId } from "@/shared/types";
import { colorForUser, readableTextOn } from "../utils/colors";
import { useUserProfile, Avatar } from "@/features/auth";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: number | string | undefined;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

interface RenderedMessage {
  kind: "system" | "message";
  content: string;
  timestamp: string;
  name?: string;
  userId?: number | string;
  userColor?: string;
  showHeader: boolean;
  isOwn: boolean;
  key: string;
}

function toRendered(
  messages: ChatMessage[],
  currentUserId: number | string | undefined,
): RenderedMessage[] {
  const out: RenderedMessage[] = [];
  messages.forEach((msg, idx) => {
    if (msg.type === "system") {
      out.push({
        kind: "system",
        content: msg.content,
        timestamp: msg.timestamp,
        showHeader: false,
        isOwn: false,
        key: `sys-${idx}`,
      });
      return;
    }
    if (!isUserMessage(msg)) return;

    const prev = messages[idx - 1];
    const prevUser =
      prev && isUserMessage(prev) ? prev.user_id : undefined;
    const showHeader =
      prev === undefined || prev.type !== "message" || prevUser !== msg.user_id;

    out.push({
      kind: "message",
      content: msg.content,
      timestamp: msg.timestamp,
      name: msg.name,
      userId: msg.user_id,
      userColor: colorForUser(msg.user_id),
      showHeader,
      isOwn: msg.user_id === currentUserId,
      key: `msg-${idx}`,
    });
  });
  return out;
}

function MessageAvatar({
  userId,
  name,
  isOwn,
  visible,
}: {
  userId: UserId;
  name: string;
  isOwn: boolean;
  visible: boolean;
}) {
  const { profile } = useUserProfile(userId);
  const imageUrl = profile?.profile_image ?? null;

  return (
    <div className={visible ? "visible" : "invisible"}>
      <Avatar
        userId={userId}
        name={name}
        imageUrl={imageUrl}
        size={36}
        href={isOwn ? undefined : `/users/${userId}`}
        interactive={!isOwn}
      />
    </div>
  );
}

function MessageList({ messages, currentUserId }: MessageListProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const rendered = toRendered(messages, currentUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-2 text-[13px]">
        {t("chat.noMessagesYet")}
      </div>
    );
  }

  return (
    <div
      className="message-list flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1"
    >
      {rendered.map((row) => {
        if (row.kind === "system") {
          return (
            <div
              key={row.key}
              className="text-center text-fg-2 text-xs py-1.5"
            >
              — {row.content} —
            </div>
          );
        }

        const isOwn = row.isOwn;
        const color = row.userColor ?? "#6366f1";
        const onColor = readableTextOn(color);

        return (
          <div
            key={row.key}
            className={
              "flex gap-2.5 " +
              (row.showHeader ? "py-2 pb-0.5" : "py-0.5") +
              " " +
              (isOwn ? "flex-row-reverse" : "flex-row")
            }
          >
            {row.userId != null && (
              <MessageAvatar
                userId={row.userId}
                name={row.name ?? "?"}
                isOwn={isOwn}
                visible={row.showHeader}
              />
            )}

            <div
              className={
                "flex flex-col max-w-[70%] " +
                (isOwn ? "items-end" : "items-start")
              }
            >
              {row.showHeader && (
                <div
                  className={
                    "flex gap-2 items-baseline mb-0.5 " +
                    (isOwn ? "flex-row-reverse" : "flex-row")
                  }
                >
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color }}
                  >
                    {isOwn ? t("common.you") : row.name}
                  </span>
                  <span className="text-[11px] text-fg-2">
                    {formatTime(row.timestamp)}
                  </span>
                </div>
              )}
              <div
                className={
                  "px-3 py-2 rounded-xl break-words whitespace-pre-wrap " +
                  "text-sm leading-relaxed " +
                  (isOwn
                    ? "rounded-tr-sm"
                    : "rounded-tl-sm border-l-[3px]")
                }
                style={
                  isOwn
                    ? { background: color, color: onColor }
                    : {
                        background: "var(--color-bg-2)",
                        color: "var(--color-fg-0)",
                        borderLeftColor: color,
                      }
                }
              >
                {row.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default memo(MessageList);
