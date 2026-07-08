import { memo, useEffect, useRef } from "react";
import { isUserMessage, type ChatMessage } from "@/shared/types";
import { colorForUser, readableTextOn } from "../utils/colors";

interface MessageListProps {
  messages: ChatMessage[];
  /** ID of the current user (so we can right-align their own messages). */
  currentUserId: number | string | undefined;
}

/** Format an ISO timestamp as a short local time, e.g. "14:23". */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** First letter of a name, uppercased, for the avatar bubble. */
function initial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

interface RenderedMessage {
  kind: "system" | "message";
  content: string;
  timestamp: string;
  name?: string;
  userId?: number | string;
  /** Hex color assigned to this user (stable across clients). */
  userColor?: string;
  /** Whether to show the avatar/name header (collapsed otherwise). */
  showHeader: boolean;
  isOwn: boolean;
  key: string;
}

/** Pre-process the raw message stream into render-ready rows. Doing this in
 *  one pass keeps the render code simple and lets us compute `showHeader`
 *  (message grouping) without re-narrowing types in JSX. */
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
    if (!isUserMessage(msg)) return; // `history` should never reach here —
    // the socket hook unwraps it. Defensive guard just in case.

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

function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const rendered = toRendered(messages, currentUserId);

  // Auto-scroll to the newest message whenever the list changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-2 text-[13px]">
        No messages yet — say hello 👋
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
            {/* Avatar — every user gets their own color */}
            <div
              className={
                "w-9 h-9 rounded-full flex items-center justify-center " +
                "font-semibold text-sm flex-shrink-0 " +
                (row.showHeader ? "visible" : "invisible")
              }
              style={{ background: color, color: onColor }}
            >
              {initial(row.name ?? "?")}
            </div>

            {/* Bubble + meta */}
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
                    {isOwn ? "You" : row.name}
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
